/**
 * Auto-sync orchestration after install / update / remove operations.
 *
 * Decoupled from `install.ts` so the install/update/remove handlers focus on
 * lockfile mutations only. The `syncFn` parameter (typically
 * `syncInstalledSkills` from `install.ts`) is injected to avoid an import
 * cycle.
 */

import { DEFAULT_INSTALL_SCOPE } from "./config.js";
import type {
  InstallScope,
  LockfileState,
  NowFn,
  SyncCommandResult,
  SyncHistory,
  SyncWriteMode,
} from "./types.js";

/**
 * Resolves the list of adapter ids that should receive a sync. When an
 * explicit override is provided, only that adapter is targeted. Otherwise,
 * the active adapter (if any) is listed first followed by the remaining
 * detected adapters in workspace order.
 */
export function resolveSyncAdapterIds(
  adapters: LockfileState["adapters"],
  adapterOverride?: string,
): string[] {
  if (adapterOverride) {
    return [adapterOverride];
  }

  const adapterIds: string[] = [];
  if (adapters.active) {
    adapterIds.push(adapters.active);
  }
  for (const adapterId of adapters.detected || []) {
    if (!adapterIds.includes(adapterId)) {
      adapterIds.push(adapterId);
    }
  }
  return adapterIds;
}

/** Options passed to `maybeAutoSync` after install / update operations. */
export interface MaybeAutoSyncOptions {
  cwd: string;
  scope?: InstallScope | undefined;
  agentSkillsDir?: string | undefined;
  adapters: LockfileState["adapters"];
  adapterOverride?: string | undefined;
  enabled: boolean;
  now: NowFn;
  changed: boolean;
  mode?: SyncWriteMode | undefined;
}

/** Sync function shape injected by callers (typically `syncInstalledSkills`). */
export type SyncFn = (options: {
  cwd: string;
  scope: InstallScope;
  agentSkillsDir?: string;
  adapter?: string;
  mode?: SyncWriteMode;
  now: NowFn;
}) => Promise<SyncCommandResult>;

/**
 * Triggers a sync after install/update when auto-sync is enabled and at
 * least one skill changed. Returns `null` when no sync was performed.
 */
export async function maybeAutoSync(
  options: MaybeAutoSyncOptions,
  syncFn: SyncFn,
): Promise<SyncCommandResult | null> {
  if (!options.enabled || !options.changed) {
    return null;
  }

  if (resolveSyncAdapterIds(options.adapters, options.adapterOverride).length === 0) {
    return null;
  }

  return syncFn({
    cwd: options.cwd,
    scope: options.scope || DEFAULT_INSTALL_SCOPE,
    ...(options.agentSkillsDir ? { agentSkillsDir: options.agentSkillsDir } : {}),
    ...(options.adapterOverride ? { adapter: options.adapterOverride } : {}),
    ...(options.mode ? { mode: options.mode } : {}),
    now: options.now,
  });
}

/** Options passed to `maybeSyncAfterRemove`. */
export interface MaybeSyncAfterRemoveOptions {
  cwd: string;
  scope?: InstallScope | undefined;
  agentSkillsDir?: string | undefined;
  adapters: LockfileState["adapters"];
  adapterOverride?: string | undefined;
  syncHistory: SyncHistory;
  legacySync: LockfileState["sync"];
  enabled: boolean;
  now: NowFn;
  changed: boolean;
  mode?: SyncWriteMode | undefined;
}

/**
 * Triggers a sync after remove operations across every previously-synced
 * adapter (so that removed skills are dropped from each adapter's view).
 *
 * Each adapter is synced concurrently via `Promise.all` and the results are
 * aggregated into an array so callers can report each adapter's outcome
 * individually. Returns `null` when no sync was performed (no changes or
 * no adapters to sync).
 */
export async function maybeSyncAfterRemove(
  options: MaybeSyncAfterRemoveOptions,
  syncFn: SyncFn,
): Promise<SyncCommandResult[] | null> {
  if (!options.changed) {
    return null;
  }

  const adapters = new Set<string>();
  for (const adapterId of Object.keys(options.syncHistory || {})) {
    adapters.add(adapterId);
  }
  if (options.legacySync?.adapter) {
    adapters.add(options.legacySync.adapter);
  }
  if (options.adapterOverride) {
    adapters.add(options.adapterOverride);
  } else if (options.enabled) {
    for (const adapterId of resolveSyncAdapterIds(options.adapters)) {
      adapters.add(adapterId);
    }
  }

  if (adapters.size === 0) {
    return null;
  }

  const results = await Promise.all(
    [...adapters].map((adapterId) =>
      syncFn({
        cwd: options.cwd,
        scope: options.scope || DEFAULT_INSTALL_SCOPE,
        ...(options.agentSkillsDir ? { agentSkillsDir: options.agentSkillsDir } : {}),
        adapter: adapterId,
        ...(options.mode ? { mode: options.mode } : {}),
        now: options.now,
      }),
    ),
  );

  return results;
}
