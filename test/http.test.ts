import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchJson,
  fetchOptionalJson,
  fetchText,
  isGitHubHost,
  setDefaultHttpTimeoutMs,
  getDefaultHttpTimeoutMs,
} from "../src/http.js";
import { HttpError } from "../src/types.js";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_TIMEOUT = getDefaultHttpTimeoutMs();
const ORIGINAL_TOKEN = process.env.GITHUB_TOKEN;

function restoreEnv(): void {
  globalThis.fetch = ORIGINAL_FETCH;
  setDefaultHttpTimeoutMs(ORIGINAL_TIMEOUT);
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.GITHUB_TOKEN;
  } else {
    process.env.GITHUB_TOKEN = ORIGINAL_TOKEN;
  }
}

test("isGitHubHost recognises GitHub-owned hosts", () => {
  assert.equal(isGitHubHost("https://api.github.com/repos/foo/bar"), true);
  assert.equal(isGitHubHost("https://raw.githubusercontent.com/foo/bar/main/file"), true);
  assert.equal(isGitHubHost("https://something.githubusercontent.com/path"), true);
  assert.equal(isGitHubHost("https://example.com/catalog.json"), false);
  assert.equal(isGitHubHost("https://api.github.com.evil.example/x"), false);
  assert.equal(isGitHubHost("not a url"), false);
});

test("fetchJson aborts after the default timeout", async (t) => {
  setDefaultHttpTimeoutMs(60);
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    await new Promise((resolve, reject) => {
      const onAbort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      init?.signal?.addEventListener("abort", onAbort);
      setTimeout(() => resolve(undefined), 5_000);
    });
    throw new Error("should have aborted");
  }) as typeof fetch;
  t.after(restoreEnv);

  await assert.rejects(
    fetchJson("https://api.github.com/repos/x/y"),
    (error: unknown) => {
      assert.ok(error instanceof HttpError, "expected HttpError");
      assert.equal((error as HttpError).code, "HTTP_TIMEOUT");
      return true;
    },
  );
});

test("403 with X-RateLimit-Remaining: 0 raises HTTP_RATE_LIMIT", async (t) => {
  globalThis.fetch = (async () =>
    new Response("forbidden", {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 120),
      },
    })) as typeof fetch;
  t.after(restoreEnv);

  await assert.rejects(
    fetchText("https://api.github.com/repos/x/y"),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal((error as HttpError).code, "HTTP_RATE_LIMIT");
      assert.match((error as HttpError).message, /rate limit/i);
      return true;
    },
  );
});

test("403 without rate-limit headers raises HTTP_AUTH_FAILED", async (t) => {
  globalThis.fetch = (async () => new Response("denied", { status: 403 })) as typeof fetch;
  t.after(restoreEnv);

  await assert.rejects(
    fetchJson("https://api.github.com/repos/x/y"),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal((error as HttpError).code, "HTTP_AUTH_FAILED");
      return true;
    },
  );
});

test("404 raises HTTP_NOT_FOUND for required fetchers and null for optional fetchers", async (t) => {
  globalThis.fetch = (async () => new Response("missing", { status: 404 })) as typeof fetch;
  t.after(restoreEnv);

  await assert.rejects(
    fetchJson("https://api.github.com/repos/x/y"),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal((error as HttpError).code, "HTTP_NOT_FOUND");
      return true;
    },
  );

  const optional = await fetchOptionalJson("https://api.github.com/repos/x/y");
  assert.equal(optional, null);
});

test("Authorization header is suppressed for non-GitHub hosts", async (t) => {
  process.env.GITHUB_TOKEN = "test-token";
  let observedHeaders: Record<string, string> | null = null;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    observedHeaders = {};
    headers.forEach((value, key) => {
      (observedHeaders as Record<string, string>)[key.toLowerCase()] = value;
    });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  t.after(restoreEnv);

  await fetchJson("https://example.com/catalog.json");
  assert.ok(observedHeaders, "fetch should have been called");
  assert.equal((observedHeaders as Record<string, string>)["authorization"], undefined);
});

test("Authorization header is attached for GitHub hosts when GITHUB_TOKEN is set", async (t) => {
  process.env.GITHUB_TOKEN = "test-token";
  let observedHeaders: Record<string, string> | null = null;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    observedHeaders = {};
    headers.forEach((value, key) => {
      (observedHeaders as Record<string, string>)[key.toLowerCase()] = value;
    });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  t.after(restoreEnv);

  await fetchJson("https://api.github.com/repos/x/y");
  assert.ok(observedHeaders, "fetch should have been called");
  assert.equal((observedHeaders as Record<string, string>)["authorization"], "Bearer test-token");
});
