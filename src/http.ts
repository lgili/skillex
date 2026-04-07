/**
 * HTTP fetch utilities with GitHub API support.
 *
 * Automatically attaches GitHub headers and, when `GITHUB_TOKEN` is set in
 * the environment, an `Authorization: Bearer` header to raise the API rate
 * limit from 60 to 5,000 requests per hour.
 */

import { debug } from "./output.js";

/**
 * Fetches a JSON document and parses it with default Skillex headers.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Parsed JSON payload.
 * @throws {Error} With an actionable message on HTTP errors.
 */
export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  debug(`GET ${url}`);
  const response = await fetch(url, withDefaultHeaders(init));
  debug(`${response.status} ${url}`);
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage(url, response.status));
  }
  return (await response.json()) as T;
}

/**
 * Fetches a UTF-8 text resource with default Skillex headers.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Response text body.
 * @throws {Error} With an actionable message on HTTP errors.
 */
export async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  debug(`GET ${url}`);
  const response = await fetch(url, withDefaultHeaders(init));
  debug(`${response.status} ${url}`);
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage(url, response.status));
  }
  return response.text();
}

/**
 * Fetches a UTF-8 text resource and returns `null` when the resource does not exist.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Response text body or `null` for HTTP 404.
 * @throws {Error} With an actionable message on non-404 HTTP errors.
 */
export async function fetchOptionalText(url: string, init: RequestInit = {}): Promise<string | null> {
  debug(`GET ${url}`);
  const response = await fetch(url, withDefaultHeaders(init));
  debug(`${response.status} ${url}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage(url, response.status));
  }
  return response.text();
}

/**
 * Fetches a JSON document and returns `null` when the resource does not exist.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Parsed JSON payload or `null` for HTTP 404.
 * @throws {Error} With an actionable message on non-404 HTTP errors.
 */
export async function fetchOptionalJson<T>(url: string, init: RequestInit = {}): Promise<T | null> {
  debug(`GET ${url}`);
  const response = await fetch(url, withDefaultHeaders(init));
  debug(`${response.status} ${url}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage(url, response.status));
  }
  return (await response.json()) as T;
}

/**
 * Applies default HTTP headers expected by GitHub-hosted catalog requests.
 * Attaches `Authorization: Bearer` when `GITHUB_TOKEN` is set in the environment.
 *
 * @param init - User-supplied fetch options.
 * @returns Fetch options with default headers merged in.
 */
function withDefaultHeaders(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers || {});
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "skillex");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/vnd.github+json");
  }
  const token = process.env.GITHUB_TOKEN;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
    debug("Using GITHUB_TOKEN for authentication");
  }
  return { ...init, headers };
}

/**
 * Builds a human-readable, actionable error message for HTTP failures.
 *
 * @param url - The URL that failed.
 * @param status - HTTP response status code.
 * @returns Descriptive error message.
 */
function buildHttpErrorMessage(url: string, status: number): string {
  if (status === 403) {
    return "GitHub API rate limit exceeded or access denied. Set the GITHUB_TOKEN environment variable to authenticate.";
  }
  if (status === 404) {
    return `Repository or file not found. Check that --repo is correct and the repository is public. (${url})`;
  }
  if (status >= 500) {
    return `GitHub API returned a server error (${status}). Try again in a moment.`;
  }
  return `Failed to fetch ${url} (HTTP ${status})`;
}
