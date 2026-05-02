/**
 * Lockfile shape, normalization, source-list management, and migration helpers.
 *
 * Keeps `install.ts` focused on install/update/remove orchestration. All
 * callers should import from here directly; `install.ts` re-exports these
 * symbols for backward compatibility with existing test imports.
 */

import { DEFAULT_REF, DEFAULT_REPO } from "./config.js";
import type {
  CatalogSource,
  LockfileSource,
  LockfileState,
  NowFn,
  SyncHistory,
} from "./types.js";

/** Repos that are known placeholder values written by older versions and must be ignored. */
export const PLACEHOLDER_REPOS = new Set(["owner/repo"]);

/**
 * Builds an empty lockfile seeded with a single source and `autoSync` on by default.
 */
export function createBaseLockfile(source: CatalogSource, now: NowFn): LockfileState {
  return {
    formatVersion: 1,
    createdAt: now(),
    updatedAt: now(),
    sources: [toLockfileSource(source)],
    adapters: {
      active: null,
      detected: [],
    },
    settings: {
      autoSync: true,
    },
    sync: null,
    syncHistory: {},
    syncMode: null,
    installed: {},
  };
}

/**
 * Normalizes a possibly-legacy lockfile shape into the current `LockfileState`.
 * Handles arrays-of-strings adapters from very old versions, missing
 * `syncHistory`, and the deprecated single `sync` field.
 */
export function normalizeLockfile(
  existing: LockfileState | null,
  source: CatalogSource,
  now: NowFn,
): LockfileState {
  if (!existing) {
    return createBaseLockfile(source, now);
  }

  const detectedAdapters = Array.isArray(existing.adapters)
    ? (existing.adapters as unknown as string[])
    : Array.isArray(existing.adapters?.detected)
      ? existing.adapters.detected
      : [];

  const activeAdapter = Array.isArray(existing.adapters)
    ? (existing.adapters as unknown as string[])[0] || null
    : existing.adapters?.active || detectedAdapters[0] || null;

  return {
    formatVersion: Number(existing.formatVersion || 1),
    createdAt: existing.createdAt || now(),
    updatedAt: existing.updatedAt || now(),
    sources: getLockfileSources(existing, source),
    adapters: {
      active: activeAdapter,
      detected: [...new Set(detectedAdapters.filter(Boolean))],
    },
    settings: {
      autoSync: existing.settings?.autoSync ?? true,
    },
    sync: existing.sync || null,
    syncHistory: normalizeSyncHistory(existing),
    syncMode: existing.syncMode || null,
    installed: existing.installed || {},
  };
}

/**
 * Coerces the historic and current shapes of `syncHistory` into the
 * normalized form, including a fallback that rebuilds the history from a
 * legacy single-`sync` field.
 */
export function normalizeSyncHistory(existing: LockfileState | null): SyncHistory {
  const history: SyncHistory = {};
  const candidate =
    existing && "syncHistory" in existing && existing.syncHistory && typeof existing.syncHistory === "object"
      ? existing.syncHistory
      : null;

  if (candidate) {
    for (const [adapterId, metadata] of Object.entries(candidate)) {
      if (!metadata || typeof metadata !== "object") {
        continue;
      }
      if (!("adapter" in metadata) || !("targetPath" in metadata) || !("syncedAt" in metadata)) {
        continue;
      }
      history[adapterId] = metadata as SyncHistory[string];
    }
  }

  if (existing?.sync?.adapter && !history[existing.sync.adapter]) {
    history[existing.sync.adapter] = existing.sync;
  }

  return history;
}

/**
 * Resolves the configured source list, dropping placeholders and falling back
 * to legacy single-catalog metadata when no `sources` array exists.
 */
export function getLockfileSources(
  existing: LockfileState | null,
  fallbackSource: CatalogSource,
): LockfileSource[] {
  const legacyCatalog = getLegacyCatalog(existing);
  const configuredSources = Array.isArray(existing?.sources)
    ? existing.sources
        .filter((entry): entry is LockfileSource => Boolean(entry?.repo))
        .filter((entry) => !PLACEHOLDER_REPOS.has(entry.repo))
        .map((entry) => ({
          repo: entry.repo,
          ref: entry.ref || DEFAULT_REF,
          ...(entry.label ? { label: entry.label } : {}),
        }))
    : [];

  if (configuredSources.length > 0) {
    return dedupeSources(configuredSources);
  }

  if (legacyCatalog?.repo && !PLACEHOLDER_REPOS.has(legacyCatalog.repo)) {
    return dedupeSources([
      {
        repo: legacyCatalog.repo,
        ref: legacyCatalog.ref || DEFAULT_REF,
      },
    ]);
  }

  return [toLockfileSource(fallbackSource)];
}

function getLegacyCatalog(existing: LockfileState | null): { repo?: string; ref?: string } | null {
  if (!existing || !("catalog" in existing)) {
    return null;
  }
  const legacyState = existing as LockfileState & { catalog?: { repo?: string; ref?: string } };
  return legacyState.catalog || null;
}

/**
 * Deduplicates a source list keyed by `${repo}@${ref}`, preserving the
 * first occurrence (which carries any label).
 */
export function dedupeSources(sources: LockfileSource[]): LockfileSource[] {
  const unique = new Map<string, LockfileSource>();
  for (const source of sources) {
    const key = `${source.repo}@${source.ref}`;
    if (!unique.has(key)) {
      unique.set(key, source);
    }
  }
  return [...unique.values()];
}

/**
 * Converts a `CatalogSource` to a `LockfileSource`, attaching a label only
 * when one is explicitly provided or when the source is the default
 * first-party repo (which gets the `official` label automatically).
 */
export function toLockfileSource(source: CatalogSource, label?: string): LockfileSource {
  const wantsLabel = Boolean(label) || source.repo === DEFAULT_REPO;
  return {
    repo: source.repo,
    ref: source.ref,
    ...(wantsLabel ? { label: label || "official" } : {}),
  };
}

/**
 * Parses a `catalog:owner/repo@ref` source string into a `LockfileSource`.
 */
export function parseCatalogSource(source: string): LockfileSource | null {
  const match = source.match(/^catalog:([^@]+\/[^@]+)@(.+)$/);
  if (!match) {
    return null;
  }
  return {
    repo: match[1]!,
    ref: match[2]!,
  };
}
