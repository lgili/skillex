/**
 * HTTP fetch utilities with GitHub API support.
 *
 * Automatically attaches a default 30-second timeout, a `User-Agent`, and a
 * GitHub `Accept` header. When `GITHUB_TOKEN` is set in the environment, an
 * `Authorization: Bearer` header is attached **only for GitHub hosts** so the
 * token does not leak to third-party `--catalog-url` targets.
 *
 * HTTP errors raise typed `HttpError` instances with codes that distinguish
 * timeouts, rate limits, auth failures, and server errors.
 */

import { debug } from "./output.js";
import { HttpError } from "./types.js";

let defaultHttpTimeoutMs = 30_000;

/**
 * Overrides the default HTTP timeout (in milliseconds) used when callers do
 * not pass their own `init.signal`. Primarily for tests; production callers
 * should rely on the default.
 *
 * @param ms - Positive integer in milliseconds.
 */
export function setDefaultHttpTimeoutMs(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new RangeError(`Invalid HTTP timeout: ${ms}`);
  }
  defaultHttpTimeoutMs = Math.floor(ms);
}

/**
 * Returns the current default HTTP timeout in milliseconds.
 */
export function getDefaultHttpTimeoutMs(): number {
  return defaultHttpTimeoutMs;
}

/**
 * Hostnames that are considered GitHub-owned for the purpose of attaching the
 * `Authorization: Bearer ${GITHUB_TOKEN}` header.
 */
const GITHUB_HOSTS = new Set(["api.github.com", "raw.githubusercontent.com"]);

/**
 * Returns `true` when the URL targets a GitHub-owned host (api or raw mirrors,
 * including any `*.githubusercontent.com` subdomain).
 */
export function isGitHubHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (GITHUB_HOSTS.has(parsed.hostname)) {
      return true;
    }
    if (parsed.hostname.endsWith(".githubusercontent.com")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetches a JSON document and parses it with default Skillex headers.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Parsed JSON payload.
 * @throws {HttpError} On non-2xx responses or timeouts.
 */
export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchWithDefaults(url, init);
  if (!response.ok) {
    throw await buildHttpError(url, response);
  }
  return (await response.json()) as T;
}

/**
 * Fetches a UTF-8 text resource with default Skillex headers.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Response text body.
 * @throws {HttpError} On non-2xx responses or timeouts.
 */
export async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const response = await fetchWithDefaults(url, init);
  if (!response.ok) {
    throw await buildHttpError(url, response);
  }
  return response.text();
}

/**
 * Fetches a UTF-8 text resource and returns `null` when the resource does not exist.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Response text body or `null` for HTTP 404.
 * @throws {HttpError} On non-404 non-2xx responses or timeouts.
 */
export async function fetchOptionalText(url: string, init: RequestInit = {}): Promise<string | null> {
  const response = await fetchWithDefaults(url, init);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await buildHttpError(url, response);
  }
  return response.text();
}

/**
 * Fetches a JSON document and returns `null` when the resource does not exist.
 *
 * @param url - Target URL.
 * @param init - Fetch init overrides.
 * @returns Parsed JSON payload or `null` for HTTP 404.
 * @throws {HttpError} On non-404 non-2xx responses or timeouts.
 */
export async function fetchOptionalJson<T>(url: string, init: RequestInit = {}): Promise<T | null> {
  const response = await fetchWithDefaults(url, init);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await buildHttpError(url, response);
  }
  return (await response.json()) as T;
}

/**
 * Performs a `fetch` with default headers and a default abort timeout. Wraps
 * abort errors into a typed `HttpError` with code `HTTP_TIMEOUT`.
 */
async function fetchWithDefaults(url: string, init: RequestInit): Promise<Response> {
  debug(`GET ${url}`);
  const { merged, attachedTimeout } = withDefaultHeaders(url, init);
  try {
    const response = await fetch(url, merged);
    debug(`${response.status} ${url}`);
    return response;
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      const timeout = attachedTimeout ?? defaultHttpTimeoutMs;
      throw new HttpError(
        `Request timed out after ${timeout}ms: ${url}`,
        "HTTP_TIMEOUT",
        { url },
      );
    }
    throw error;
  }
}

/**
 * Applies default HTTP headers expected by GitHub-hosted catalog requests.
 * Attaches `Authorization: Bearer` only when `GITHUB_TOKEN` is set AND the
 * target host is GitHub-owned.
 */
function withDefaultHeaders(
  url: string,
  init: RequestInit,
): { merged: RequestInit; attachedTimeout: number | null } {
  const headers = new Headers(init.headers || {});
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "skillex");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/vnd.github+json");
  }
  const token = process.env.GITHUB_TOKEN;
  if (token && !headers.has("Authorization")) {
    if (isGitHubHost(url)) {
      headers.set("Authorization", `Bearer ${token}`);
      debug("Using GITHUB_TOKEN for authentication");
    } else {
      debug(`GITHUB_TOKEN suppressed: non-GitHub host (${safeHost(url)})`);
    }
  }

  let attachedTimeout: number | null = null;
  let signal = init.signal;
  if (signal === undefined || signal === null) {
    attachedTimeout = defaultHttpTimeoutMs;
    signal = AbortSignal.timeout(defaultHttpTimeoutMs);
  }

  const merged: RequestInit = {
    ...init,
    headers,
    signal,
  };
  return { merged, attachedTimeout };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "<invalid-url>";
  }
}

/**
 * Builds a typed `HttpError` for a non-2xx response, splitting 403 into
 * rate-limit vs auth based on `X-RateLimit-Remaining`.
 */
async function buildHttpError(url: string, response: Response): Promise<HttpError> {
  const status = response.status;

  if (status === 403 || status === 401) {
    const remainingHeader = response.headers.get("x-ratelimit-remaining");
    const isRateLimited = status === 403 && remainingHeader !== null && remainingHeader.trim() === "0";
    if (isRateLimited) {
      const reset = response.headers.get("x-ratelimit-reset");
      const resetHint = reset ? buildResetHint(reset) : "Set GITHUB_TOKEN to raise the limit.";
      return new HttpError(
        `GitHub API rate limit exceeded. ${resetHint}`,
        "HTTP_RATE_LIMIT",
        { status, url },
      );
    }
    return new HttpError(
      "GitHub API authentication failed. Check that GITHUB_TOKEN is valid and has access.",
      "HTTP_AUTH_FAILED",
      { status, url },
    );
  }

  if (status === 404) {
    return new HttpError(
      `Repository or file not found. Check that --repo is correct and the repository is public. (${url})`,
      "HTTP_NOT_FOUND",
      { status, url },
    );
  }

  if (status >= 500) {
    return new HttpError(
      `GitHub API returned a server error (${status}). Try again in a moment.`,
      "HTTP_SERVER_ERROR",
      { status, url },
    );
  }

  return new HttpError(`Failed to fetch ${url} (HTTP ${status})`, "HTTP_ERROR", { status, url });
}

function buildResetHint(resetEpoch: string): string {
  const epoch = Number(resetEpoch);
  if (!Number.isFinite(epoch)) {
    return "Set GITHUB_TOKEN to raise the limit.";
  }
  const resetDate = new Date(epoch * 1000);
  const seconds = Math.max(0, Math.round((resetDate.getTime() - Date.now()) / 1000));
  if (seconds < 60) {
    return `Resets in ${seconds}s. Set GITHUB_TOKEN to raise the limit.`;
  }
  const minutes = Math.round(seconds / 60);
  return `Resets in ~${minutes}m. Set GITHUB_TOKEN to raise the limit.`;
}
