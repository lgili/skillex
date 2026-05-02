/**
 * Workspace and environment health checks.
 *
 * Used by both the CLI `skillex doctor` command and the Web UI's Doctor
 * panel. Returns a structured `DoctorReport` so callers can render however
 * they want (CLI text, JSON, Vue components).
 */

import * as path from "node:path";
import { listAdapters } from "./adapters.js";
import { computeCatalogCacheKey, readCatalogCache } from "./catalog.js";
import { DEFAULT_INSTALL_SCOPE, getScopedStatePaths } from "./config.js";
import {
  getInstalledSkills,
  resolveProjectSource,
} from "./install.js";
import type { ProjectOptions } from "./types.js";

/** Status indicator for a single doctor check. */
export type DoctorStatus = "pass" | "warn" | "fail";

/** A single named health check result. */
export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  message: string;
  hint?: string | undefined;
}

/** Aggregate report shape returned by `runDoctorChecks`. */
export interface DoctorReport {
  scope: "local" | "global";
  stateDir: string;
  checks: DoctorCheck[];
  /** True when at least one check has status `"fail"`. */
  hasFailures: boolean;
}

/**
 * Runs the canonical six health checks and returns a structured report.
 * No I/O beyond reading the lockfile, an HTTP HEAD probe to api.github.com,
 * and a peek at the catalog cache directory.
 */
export async function runDoctorChecks(options: ProjectOptions = {}): Promise<DoctorReport> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const statePaths = getScopedStatePaths(cwd, {
    scope: options.scope ?? DEFAULT_INSTALL_SCOPE,
    baseDir: options.agentSkillsDir,
  });
  const opts: ProjectOptions = { ...options, cwd };
  const checks: DoctorCheck[] = [];

  // 1. Lockfile
  const state = await getInstalledSkills(opts);
  if (state) {
    checks.push({
      name: "lockfile",
      status: "pass",
      message: `Lockfile present at ${statePaths.lockfilePath}`,
    });
  } else {
    checks.push({
      name: "lockfile",
      status: "fail",
      message: "No lockfile found",
      hint:
        statePaths.scope === "global"
          ? "Run: skillex init --global --adapter <id>"
          : "Run: skillex init",
    });
  }

  // 2. Source(s)
  if ((state?.sources?.length ?? 0) > 0) {
    const repos = state!.sources.map((s) => `${s.repo}@${s.ref}`).join(", ");
    checks.push({ name: "source", status: "pass", message: `Sources configured: ${repos}` });
  } else {
    checks.push({
      name: "source",
      status: "fail",
      message: "No catalog source configured",
      hint: "Run: skillex source add <owner/repo>",
    });
  }

  // 3. Adapter
  const hasAdapter = Boolean(state?.adapters?.active || (state?.adapters?.detected?.length ?? 0) > 0);
  if (hasAdapter) {
    const adapter = state?.adapters?.active ?? state?.adapters?.detected?.[0];
    checks.push({ name: "adapter", status: "pass", message: `Active: ${adapter}` });
  } else {
    checks.push({
      name: "adapter",
      status: "fail",
      message: "No adapter detected",
      hint: `Use --adapter <id>. Available: ${listAdapters().map((a) => a.id).join(", ")}`,
    });
  }

  // 4. GitHub reachable
  try {
    const response = await fetch("https://api.github.com", {
      method: "HEAD",
      headers: { "User-Agent": "skillex" },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status < 500) {
      checks.push({ name: "github", status: "pass", message: "GitHub API is reachable" });
    } else {
      checks.push({
        name: "github",
        status: "fail",
        message: `GitHub returned a server error (status ${response.status})`,
        hint: "Try again in a moment.",
      });
    }
  } catch (error) {
    const cause = (error as { cause?: { code?: string } })?.cause?.code
      ?? (error as { code?: string })?.code
      ?? null;
    const message = error instanceof Error ? error.message : String(error);
    if (cause === "EAI_AGAIN" || cause === "ENOTFOUND") {
      checks.push({
        name: "github",
        status: "fail",
        message: "DNS lookup failed for api.github.com",
        hint: `Check your network or DNS resolver. (${message})`,
      });
    } else if (cause === "ECONNREFUSED") {
      checks.push({
        name: "github",
        status: "fail",
        message: "Connection refused by api.github.com",
        hint: `Check your firewall or proxy. (${message})`,
      });
    } else if (cause === "CERT_HAS_EXPIRED" || cause === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      checks.push({
        name: "github",
        status: "fail",
        message: "TLS handshake failed",
        hint: `Check the system clock or any TLS-intercepting proxy. (${message})`,
      });
    } else if (cause === "ETIMEDOUT" || (error as { name?: string })?.name === "TimeoutError") {
      checks.push({
        name: "github",
        status: "fail",
        message: "Connection to api.github.com timed out",
        hint: `Check your network connectivity. (${message})`,
      });
    } else {
      checks.push({
        name: "github",
        status: "fail",
        message: "GitHub API is unreachable",
        hint: `Check your internet connection or proxy settings. (${message})`,
      });
    }
  }

  // 5. GitHub token (warning only — never fails)
  const token = process.env.GITHUB_TOKEN;
  checks.push({
    name: "token",
    status: "pass",
    message: token
      ? "GitHub token set (authenticated — 5,000 req/hr)"
      : "No GitHub token (unauthenticated — 60 req/hr)",
  });

  // 6. Cache
  const cacheDir = path.join(statePaths.stateDir, ".cache");
  if ((state?.sources?.length ?? 0) > 0) {
    const source = await resolveProjectSource(opts);
    const cacheKey = computeCatalogCacheKey(source);
    const cached = await readCatalogCache(cacheDir, cacheKey);
    if (cached) {
      checks.push({ name: "cache", status: "pass", message: "Catalog cache is fresh" });
    } else {
      checks.push({
        name: "cache",
        status: "pass",
        message: "No cached catalog (will fetch on next command)",
      });
    }
  } else {
    checks.push({ name: "cache", status: "pass", message: "Cache not checked (no source configured)" });
  }

  return {
    scope: statePaths.scope,
    stateDir: statePaths.stateDir,
    checks,
    hasFailures: checks.some((c) => c.status === "fail"),
  };
}
