/**
 * Install / update / remove orchestration for catalog and direct-GitHub skills.
 *
 * Historically this module owned every install-related concern. Lockfile
 * shape, direct-GitHub install, auto-sync, and the shared file downloader
 * have been extracted into focused modules. This file now contains only
 * orchestration and re-exports the moved symbols so existing imports keep
 * working until callers migrate to the canonical paths.
 *
 * Re-export shim → canonical module mapping:
 * - lockfile shape and source-list helpers      → ./lockfile.js
 * - direct GitHub parsing / fetch / download    → ./direct-github.js
 * - auto-sync orchestration                     → ./auto-sync.js
 * - shared per-file download helper             → ./downloader.js
 */

import * as path from "node:path";
import {
  DEFAULT_AGENT_SKILLS_DIR,
  DEFAULT_INSTALL_SCOPE,
  DEFAULT_REF,
  DEFAULT_REPO,
  getScopedStatePaths,
} from "./config.js";
import { ensureDir, isPathInside, pathExists, readJson, removePath, writeJson, writeText } from "./fs.js";
import { buildRawGitHubUrl, loadCatalog, resolveSource } from "./catalog.js";
import { resolveAdapterState } from "./adapters.js";
import { loadInstalledSkillDocuments, syncAdapterFiles } from "./sync.js";
import {
  downloadSkillFiles,
  writeDownloadedManifest,
  type DownloadedSkillManifest,
} from "./downloader.js";
import {
  createBaseLockfile,
  dedupeSources,
  getLockfileSources,
  normalizeLockfile,
  normalizeSyncHistory,
  parseCatalogSource,
  PLACEHOLDER_REPOS,
  toLockfileSource,
} from "./lockfile.js";
import {
  confirmDirectInstall,
  downloadDirectGitHubSkill,
  fetchDirectGitHubSkill,
  normalizeDirectManifest,
  parseDirectGitHubRef,
  parseGitHubSource,
  type DirectInstallPayload,
} from "./direct-github.js";
import {
  maybeAutoSync,
  maybeSyncAfterRemove,
  resolveSyncAdapterIds,
  type SyncFn,
} from "./auto-sync.js";
import type {
  AggregatedCatalogData,
  CatalogData,
  CatalogLoader,
  CatalogSource,
  CatalogSourceInput,
  DirectGitHubRef,
  InitProjectResult,
  InstallSkillsResult,
  LockfileSource,
  LockfileState,
  NowFn,
  ProjectOptions,
  RemoveSkillsResult,
  ResolvedSkillSelection,
  StatePaths,
  SourcedSkillManifest,
  SkillDownloader,
  SkillManifest,
  InstallScope,
  SyncCommandResult,
  SyncHistory,
  SyncWriteMode,
  UpdateInstalledSkillsResult,
} from "./types.js";
import { CliError, InstallError } from "./types.js";

// Re-export everything moved to focused modules so existing imports keep working.
export {
  createBaseLockfile,
  dedupeSources,
  getLockfileSources,
  normalizeLockfile,
  normalizeSyncHistory,
  parseCatalogSource,
  PLACEHOLDER_REPOS,
  toLockfileSource,
} from "./lockfile.js";
export {
  confirmDirectInstall,
  downloadDirectGitHubSkill,
  fetchDirectGitHubSkill,
  normalizeDirectManifest,
  parseDirectGitHubRef,
  parseGitHubSource,
} from "./direct-github.js";
export type { DirectInstallPayload } from "./direct-github.js";
export {
  maybeAutoSync,
  maybeSyncAfterRemove,
  resolveSyncAdapterIds,
} from "./auto-sync.js";
export type { SyncFn } from "./auto-sync.js";
export {
  downloadSkillFiles,
  writeDownloadedManifest,
} from "./downloader.js";
export type { DownloadedSkillManifest } from "./downloader.js";

interface InstallOptions extends ProjectOptions {
  catalogLoader?: CatalogLoader;
  downloader?: SkillDownloader;
  installAll?: boolean;
  confirm?: (() => Promise<boolean>) | undefined;
  warn?: ((message: string) => void) | undefined;
}

/**
 * Initializes the local Skillex workspace state.
 *
 * @param options - Project initialization options.
 * @returns Lockfile initialization result.
 * @throws {InstallError} When initialization fails.
 */
export async function initProject(options: ProjectOptions = {}): Promise<InitProjectResult> {
  try {
    const cwd = options.cwd || process.cwd();
    const statePaths = resolveStatePathsForOptions(cwd, options);
    const now = getNow(options);

    await ensureDir(statePaths.stateDir);
    await ensureDir(statePaths.skillsDirPath);
    await ensureDir(statePaths.generatedDirPath);

    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);
    const source = resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
    const lockfile = normalizeLockfile(existing, source, now);
    lockfile.adapters = await resolveAdapterState({
      cwd,
      ...(options.adapter || lockfile.adapters.active
        ? { adapter: options.adapter || lockfile.adapters.active || undefined }
        : {}),
    });
    if (options.repo) {
      lockfile.sources = [toLockfileSource(source)];
    }
    lockfile.settings.autoSync = options.autoSync ?? lockfile.settings.autoSync;
    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);

    // Create .gitignore for the local state directory on first init.
    if (statePaths.scope === "local") {
      const gitignorePath = path.join(statePaths.stateDir, ".gitignore");
      if (!(await pathExists(gitignorePath))) {
        await writeText(gitignorePath, ".cache/\n*.log\n");
      }
    }

    return { created: !existing, statePaths, lockfile };
  } catch (error) {
    throw toInstallError(error, "Failed to initialize project");
  }
}

/**
 * Installs one or more catalog skills or direct GitHub skills into the selected Skillex state.
 *
 * @param requestedSkillIds - Requested skill ids or `owner/repo[@ref]` direct references.
 * @param options - Installation options.
 * @returns Install summary.
 * @throws {InstallError} When installation fails.
 */
export async function installSkills(
  requestedSkillIds: string[],
  options: InstallOptions = {},
): Promise<InstallSkillsResult> {
  try {
    const cwd = options.cwd || process.cwd();
    const statePaths = resolveStatePathsForOptions(cwd, options);
    const now = getNow(options);
    const catalogLoader = options.catalogLoader || loadCatalog;
    const downloader = options.downloader || downloadSkill;

    await ensureDir(statePaths.stateDir);
    await ensureDir(statePaths.skillsDirPath);
    await ensureDir(statePaths.generatedDirPath);

    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);
    const overrideSource = options.repo ? resolveSource(toCatalogSourceInput(options, { repo: options.repo, ref: options.ref })) : null;
    const defaultSource = overrideSource || resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
    const lockfile = normalizeLockfile(existing, defaultSource, now);
    if (!lockfile.adapters.active) {
      lockfile.adapters = await resolveAdapterState({
        cwd,
        ...(options.adapter ? { adapter: options.adapter } : {}),
      });
    }

    const directRefs = requestedSkillIds
      .map((skillId) => ({ input: skillId, reference: parseDirectGitHubRef(skillId) }))
      .filter((entry) => entry.reference !== null) as Array<{ input: string; reference: DirectGitHubRef }>;
    const catalogIds = requestedSkillIds.filter((skillId) => parseDirectGitHubRef(skillId) === null);
    const installedSkills: SkillManifest[] = [];

    if (options.installAll && directRefs.length > 0) {
      throw new InstallError("Do not mix --all with direct GitHub references.", "INSTALL_ALL_WITH_DIRECT_REF");
    }

    if (options.installAll || catalogIds.length > 0) {
      const selectedSkills = await selectSkillsFromSources(lockfile, catalogIds, options, catalogLoader);
      const totalCount = selectedSkills.length + directRefs.length;
      for (let i = 0; i < selectedSkills.length; i++) {
        const selection = selectedSkills[i]!;
        const skill = selection.skill;
        options.onProgress?.(i + 1, totalCount, skill.id);
        await downloader(skill, selection.catalog, statePaths.skillsDirPath);
        lockfile.installed[skill.id] = buildInstalledMetadata(skill, {
          cwd,
          statePaths,
          installedAt: now(),
          source: `catalog:${selection.catalog.repo}@${selection.catalog.ref}`,
        });
        installedSkills.push(skill);
      }
    } else if (!directRefs.length) {
      throw new InstallError(
        [
          "No install target provided. Pick one of:",
          "  • skillex install <skill-id> [<skill-id> ...]   from a configured catalog source",
          "  • skillex install --all                          install every skill in the catalog",
          "  • skillex install owner/repo[@ref] --trust       install directly from a GitHub repo",
        ].join("\n"),
        "INSTALL_REQUIRES_SKILL",
      );
    }

    for (const directRef of directRefs) {
      if (!options.trust) {
        await confirmDirectInstall(directRef.input, options);
      }

      const directSkill = await fetchDirectGitHubSkill(directRef.reference);
      await downloadDirectGitHubSkill(directSkill, statePaths.skillsDirPath);
      lockfile.installed[directSkill.manifest.id] = buildInstalledMetadata(directSkill.manifest, {
        cwd,
        statePaths,
        installedAt: now(),
        source: directSkill.source,
      });
      installedSkills.push(directSkill.manifest);
    }

    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);
    const autoSync = await maybeAutoSync(
      withAgentSkillsDir(
        {
          cwd,
          scope: options.scope,
          adapters: lockfile.adapters,
          adapterOverride: options.adapter,
          enabled: lockfile.settings.autoSync,
          now,
          changed: installedSkills.length > 0,
          mode: options.mode,
        },
        options.agentSkillsDir,
      ),
      syncInstalledSkills as SyncFn,
    );

    return {
      installedCount: installedSkills.length,
      installedSkills,
      statePaths,
      autoSync,
    };
  } catch (error) {
    throw toInstallError(error, "Failed to install skills");
  }
}

/**
 * Updates installed skills from the configured remote catalog or their direct GitHub sources.
 *
 * @param requestedSkillIds - Optional subset of installed skills to update.
 * @param options - Update options.
 * @returns Update summary.
 * @throws {InstallError} When update fails.
 */
export async function updateInstalledSkills(
  requestedSkillIds: string[],
  options: InstallOptions = {},
): Promise<UpdateInstalledSkillsResult> {
  try {
    const cwd = options.cwd || process.cwd();
    const statePaths = resolveStatePathsForOptions(cwd, options);
    const now = getNow(options);
    const catalogLoader = options.catalogLoader || loadCatalog;
    const downloader = options.downloader || downloadSkill;
    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

    if (!existing) {
      throw new InstallError(
        statePaths.scope === "global"
          ? "No global installation found. Run: skillex init --global --adapter <id>"
          : "No local installation found. Run: skillex init",
        "LOCKFILE_MISSING",
      );
    }

    const defaultSource = resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
    const lockfile = normalizeLockfile(existing, defaultSource, now);
    const skillIds = resolveInstalledSkillIds(lockfile, requestedSkillIds);
    const directIds = skillIds.filter((skillId) => {
      const metadata = lockfile.installed[skillId];
      return Boolean(metadata?.source?.startsWith("github:"));
    });
    const catalogIds = skillIds.filter((skillId) => !directIds.includes(skillId));
    const updatedSkills: SkillManifest[] = [];
    const missingFromCatalog: string[] = [];

    if (catalogIds.length > 0) {
      for (const skillId of catalogIds) {
        const metadata = lockfile.installed[skillId];
        const catalogSelection = await resolveInstalledCatalogSelection(skillId, metadata?.source, options, lockfile, catalogLoader);
        if (!catalogSelection) {
          missingFromCatalog.push(skillId);
          continue;
        }

        const skill = catalogSelection.skill;
        await downloader(skill, catalogSelection.catalog, statePaths.skillsDirPath);
        lockfile.installed[skill.id] = buildInstalledMetadata(skill, {
          cwd,
          statePaths,
          installedAt: now(),
          source: `catalog:${catalogSelection.catalog.repo}@${catalogSelection.catalog.ref}`,
        });
        updatedSkills.push(skill);
      }
    }

    for (const skillId of directIds) {
      const metadata = lockfile.installed[skillId];
      const directRef = metadata?.source ? parseGitHubSource(metadata.source) : null;
      if (!directRef) {
        throw new InstallError(`Invalid direct source for "${skillId}".`, "DIRECT_SOURCE_INVALID");
      }

      const directSkill = await fetchDirectGitHubSkill(directRef);
      await downloadDirectGitHubSkill(directSkill, statePaths.skillsDirPath);
      lockfile.installed[directSkill.manifest.id] = buildInstalledMetadata(directSkill.manifest, {
        cwd,
        statePaths,
        installedAt: now(),
        source: directSkill.source,
      });
      updatedSkills.push(directSkill.manifest);
    }

    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);
    const autoSync = await maybeAutoSync(
      withAgentSkillsDir(
        {
          cwd,
          scope: options.scope,
          adapters: lockfile.adapters,
          adapterOverride: options.adapter,
          enabled: lockfile.settings.autoSync,
          now,
          changed: updatedSkills.length > 0,
          mode: options.mode,
        },
        options.agentSkillsDir,
      ),
      syncInstalledSkills as SyncFn,
    );

    return {
      statePaths,
      updatedSkills,
      missingFromCatalog,
      autoSync,
    };
  } catch (error) {
    throw toInstallError(error, "Failed to update skills");
  }
}

/**
 * Removes installed skills from the selected Skillex state.
 *
 * @param requestedSkillIds - Skill ids to remove.
 * @param options - Remove options.
 * @returns Remove summary.
 * @throws {InstallError} When removal fails.
 */
export async function removeSkills(
  requestedSkillIds: string[],
  options: ProjectOptions = {},
): Promise<RemoveSkillsResult> {
  try {
    const cwd = options.cwd || process.cwd();
    const statePaths = resolveStatePathsForOptions(cwd, options);
    const now = getNow(options);
    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

    if (!existing) {
      throw new InstallError(
        statePaths.scope === "global"
          ? "No global installation found. Run: skillex init --global --adapter <id>"
          : "No local installation found. Run: skillex init",
        "LOCKFILE_MISSING",
      );
    }

    if (!requestedSkillIds.length) {
      throw new InstallError("Provide at least one skill-id to remove.", "REMOVE_REQUIRES_SKILL");
    }

    const defaultSource = resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
    const lockfile = normalizeLockfile(existing, defaultSource, now);
    const removedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skillId of requestedSkillIds) {
      const metadata = lockfile.installed[skillId];
      if (!metadata) {
        missingSkills.push(skillId);
        continue;
      }

      const resolvedSkillPath = resolveInstalledSkillPath(cwd, metadata.path);
      if (!isPathInside(resolvedSkillPath, statePaths.skillsDirPath)) {
        throw new InstallError(
          `Refusing to remove "${skillId}": lockfile path "${metadata.path}" resolves outside the managed skills store (${statePaths.skillsDirPath}).`,
          "INSTALL_PATH_UNSAFE",
        );
      }
      await removePath(resolvedSkillPath);
      delete lockfile.installed[skillId];
      removedSkills.push(skillId);
    }

    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);
    const autoSyncs = await maybeSyncAfterRemove(
      withAgentSkillsDir(
        {
          cwd,
          scope: options.scope,
          adapters: lockfile.adapters,
          adapterOverride: options.adapter,
          syncHistory: lockfile.syncHistory,
          legacySync: lockfile.sync,
          enabled: lockfile.settings.autoSync,
          now,
          changed: removedSkills.length > 0,
          mode: options.mode,
        },
        options.agentSkillsDir,
      ),
      syncInstalledSkills as SyncFn,
    );

    return {
      statePaths,
      removedSkills,
      missingSkills,
      autoSync: autoSyncs?.[0] ?? null,
      autoSyncs: autoSyncs ?? [],
    };
  } catch (error) {
    throw toInstallError(error, "Failed to remove skills");
  }
}

/**
 * Synchronizes installed skills to the active or requested adapter target.
 *
 * @param options - Sync options.
 * @returns Sync command result.
 * @throws {InstallError} When the selected install scope is missing or invalid.
 */
export async function syncInstalledSkills(options: ProjectOptions = {}): Promise<SyncCommandResult> {
  try {
    const cwd = options.cwd || process.cwd();
    const statePaths = resolveStatePathsForOptions(cwd, options);
    const now = getNow(options);
    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

    if (!existing) {
      throw new InstallError(
        statePaths.scope === "global"
          ? "No global installation found. Run: skillex init --global --adapter <id>"
          : "No local installation found. Run: skillex init",
        "LOCKFILE_MISSING",
      );
    }

    const defaultSource = resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
    const lockfile = normalizeLockfile(existing, defaultSource, now);
    const adapterIds = resolveSyncAdapterIds(lockfile.adapters, options.adapter);
    if (adapterIds.length === 0) {
      throw new InstallError(
        "No active adapter configured. Run: skillex init --adapter <id> or use --adapter.",
        "ACTIVE_ADAPTER_MISSING",
      );
    }

    const skills = await loadInstalledSkillDocuments({
      cwd,
      lockfile,
    });
    const syncResults = [];
    const diffParts: string[] = [];

    for (const adapterId of adapterIds) {
      const syncResult = await syncAdapterFiles({
        cwd,
        scope: statePaths.scope,
        adapterId,
        statePaths,
        skills,
        previousSkillIds: lockfile.syncHistory[adapterId]?.skillIds || lockfile.sync?.skillIds || [],
        ...(options.mode ? { mode: options.mode } : {}),
        ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
      });
      syncResults.push(syncResult);
      if (syncResult.diff.trim()) {
        diffParts.push(syncResult.diff.trimEnd());
      }
    }

    const primarySync = syncResults[0];
    if (!primarySync) {
      throw new InstallError(
        "No adapter configured for synchronization. Use --adapter <id> or work in a detectable workspace.",
        "ACTIVE_ADAPTER_MISSING",
      );
    }

    if (options.dryRun) {
      return {
        statePaths,
        sync: {
          adapter: primarySync.adapter,
          targetPath: primarySync.targetPath,
        },
        syncs: syncResults.map((result) => ({
          adapter: result.adapter,
          targetPath: result.targetPath,
          syncMode: result.syncMode,
          changed: result.changed,
        })),
        skillCount: skills.length,
        changed: syncResults.some((result) => result.changed),
        diff: diffParts.length > 0 ? `${diffParts.join("\n\n")}\n` : "",
        dryRun: true,
        syncMode: primarySync.syncMode,
      };
    }

    const primaryMetadata = {
      adapter: primarySync.adapter,
      targetPath: primarySync.targetPath,
      syncedAt: now(),
      skillIds: skills.map((skill) => skill.id),
    };
    const nextSyncHistory = {
      ...lockfile.syncHistory,
      [primarySync.adapter]: primaryMetadata,
    };
    for (const syncResult of syncResults.slice(1)) {
      nextSyncHistory[syncResult.adapter] = {
        adapter: syncResult.adapter,
        targetPath: syncResult.targetPath,
        syncedAt: now(),
        skillIds: skills.map((skill) => skill.id),
      };
    }
    lockfile.sync = primaryMetadata;
    lockfile.syncHistory = nextSyncHistory;
    lockfile.syncMode = primarySync.syncMode;
    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);

    return {
      statePaths,
      sync: primaryMetadata,
      syncs: syncResults.map((result) => ({
        adapter: result.adapter,
        targetPath: result.targetPath,
        syncMode: result.syncMode,
        changed: result.changed,
      })),
      skillCount: skills.length,
      changed: syncResults.some((result) => result.changed),
      diff: diffParts.length > 0 ? `${diffParts.join("\n\n")}\n` : "",
      dryRun: false,
      syncMode: primarySync.syncMode,
    };
  } catch (error) {
    throw toInstallError(error, "Failed to synchronize skills");
  }
}

/**
 * Reads the selected Skillex lockfile when it exists.
 *
 * @param options - Project lookup options.
 * @returns Normalized lockfile state or `null` when no install exists.
 */
export async function getInstalledSkills(options: ProjectOptions = {}): Promise<LockfileState | null> {
  const cwd = options.cwd || process.cwd();
  const statePaths = resolveStatePathsForOptions(cwd, options);
  if (!(await pathExists(statePaths.lockfilePath))) {
    return null;
  }
  const source = resolveSource(toCatalogSourceInput(options, { repo: options.repo, ref: options.ref }));
  const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);
  if (!existing) {
    return null;
  }
  return normalizeLockfile(existing, source, getNow(options));
}

/**
 * Resolves the effective project catalog source using CLI overrides or local state.
 *
 * @param options - Project lookup options.
 * @returns Resolved catalog source.
 */
export async function resolveProjectSource(options: ProjectOptions = {}): Promise<CatalogSource> {
  const cwd = options.cwd || process.cwd();
  const statePaths = resolveStatePathsForOptions(cwd, options);
  const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

  return resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
}

/**
 * Resolves all effective project sources using CLI overrides or local state.
 *
 * @param options - Project lookup options.
 * @returns Resolved source list.
 */
export async function resolveProjectSources(options: ProjectOptions = {}): Promise<LockfileSource[]> {
  const cwd = options.cwd || process.cwd();
  const statePaths = resolveStatePathsForOptions(cwd, options);
  const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

  if (options.repo) {
    return [toLockfileSource(resolveSource(toCatalogSourceInput(options, { repo: options.repo, ref: options.ref })))];
  }

  return getLockfileSources(existing, resolveSource(toCatalogSourceInput(options)));
}

/**
 * Aggregates skills from all effective project sources.
 *
 * @param options - Project lookup options.
 * @param catalogLoader - Optional catalog loader override.
 * @returns Aggregated skills grouped by source metadata.
 */
export async function loadProjectCatalogs(
  options: ProjectOptions = {},
  catalogLoader: CatalogLoader = loadCatalog,
): Promise<AggregatedCatalogData> {
  const sources = await resolveProjectSources(options);
  const loaded = await Promise.all(
    sources.map(async (source) => {
      const catalog = await catalogLoader(resolveSource(toCatalogSourceInput(options, source)));
      const skills: SourcedSkillManifest[] = catalog.skills.map((skill) => ({
        ...skill,
        source: {
          repo: source.repo,
          ref: source.ref,
          ...(source.label ? { label: source.label } : {}),
        },
      }));
      return { source, catalog, skills };
    }),
  );

  return {
    formatVersion: 1,
    skills: loaded.flatMap((entry) => entry.skills),
    sources: loaded.map((entry) => ({ ...entry.source, skillCount: entry.catalog.skills.length })),
  };
}

/**
 * Adds a source to the workspace lockfile.
 *
 * @param sourceInput - Repository to add.
 * @param options - Project options.
 * @returns Updated normalized lockfile.
 */
export async function addProjectSource(
  sourceInput: { repo: string; ref?: string | undefined; label?: string | undefined },
  options: ProjectOptions = {},
): Promise<LockfileState> {
  const cwd = options.cwd || process.cwd();
  const statePaths = resolveStatePathsForOptions(cwd, options);
  const now = getNow(options);
  await ensureDir(statePaths.stateDir);
  await ensureDir(statePaths.skillsDirPath);
  await ensureDir(statePaths.generatedDirPath);
  const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);
  const fallbackSource = resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
  const lockfile = normalizeLockfile(existing, fallbackSource, now);
  const source = toLockfileSource(resolveSource(toCatalogSourceInput(options, sourceInput)), sourceInput.label);
  if (lockfile.sources.some((entry) => entry.repo === source.repo && entry.ref === source.ref)) {
    throw new InstallError(`Source \"${source.repo}@${source.ref}\" is already configured.`, "SOURCE_ALREADY_EXISTS");
  }
  lockfile.sources.push(source);
  lockfile.updatedAt = now();
  await writeJson(statePaths.lockfilePath, lockfile);
  return lockfile;
}

/**
 * Removes a source from the workspace lockfile.
 *
 * @param repo - Repository to remove.
 * @param options - Project options.
 * @returns Updated normalized lockfile.
 */
export async function removeProjectSource(repo: string, options: ProjectOptions = {}): Promise<LockfileState> {
  const cwd = options.cwd || process.cwd();
  const statePaths = resolveStatePathsForOptions(cwd, options);
  const now = getNow(options);
  const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

  if (!existing) {
    throw new InstallError(
      statePaths.scope === "global"
        ? "No global installation found. Run: skillex init --global --adapter <id>"
        : "No local installation found. Run: skillex init",
      "LOCKFILE_MISSING",
    );
  }

  const fallbackSource = resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
  const lockfile = normalizeLockfile(existing, fallbackSource, now);
  const remaining = lockfile.sources.filter((entry) => entry.repo !== repo);
  if (remaining.length === lockfile.sources.length) {
    throw new InstallError(`Source \"${repo}\" is not configured.`, "SOURCE_NOT_FOUND");
  }
  if (remaining.length === 0) {
    throw new InstallError("At least one source must remain configured.", "SOURCE_REMOVE_LAST");
  }
  lockfile.sources = remaining;
  lockfile.updatedAt = now();
  await writeJson(statePaths.lockfilePath, lockfile);
  return lockfile;
}

/**
 * Lists configured workspace sources.
 *
 * @param options - Project options.
 * @returns Normalized source list.
 */
export async function listProjectSources(options: ProjectOptions = {}): Promise<LockfileSource[]> {
  const cwd = options.cwd || process.cwd();
  const statePaths = resolveStatePathsForOptions(cwd, options);
  const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);
  const fallbackSource = resolveSource(toCatalogSourceInput(options, resolvePrimarySourceOverride(options, existing)));
  return getLockfileSources(existing, fallbackSource);
}

async function downloadSkill(skill: SkillManifest, catalog: CatalogData, skillsDirPath: string): Promise<void> {
  const skillTargetDir = path.join(skillsDirPath, skill.id);
  await downloadSkillFiles({
    repo: catalog.repo,
    ref: catalog.ref,
    skillRelPath: skill.path,
    files: skill.files,
    targetDir: skillTargetDir,
  });

  const downloaded: DownloadedSkillManifest = {
    ...skill,
    source: {
      repo: catalog.repo,
      ref: catalog.ref,
      path: skill.path,
    },
  };
  await writeDownloadedManifest(skillTargetDir, downloaded);
}

function resolvePrimarySourceOverride(
  options: ProjectOptions,
  existing: LockfileState | null,
): { repo?: string; ref?: string } {
  const sources = getLockfileSources(existing, resolveSource(toCatalogSourceInput(options)));
  const repo = options.repo || sources[0]?.repo;
  const ref = options.ref || sources[0]?.ref;
  return {
    ...(repo ? { repo } : {}),
    ...(ref ? { ref } : {}),
  };
}

async function selectSkillsFromSources(
  lockfile: LockfileState,
  requestedSkillIds: string[],
  options: InstallOptions,
  catalogLoader: CatalogLoader,
): Promise<ResolvedSkillSelection[]> {
  const sources = options.repo
    ? [toLockfileSource(resolveSource(toCatalogSourceInput(options, { repo: options.repo, ref: options.ref })))]
    : lockfile.sources;
  const catalogs = await Promise.all(
    sources.map(async (source) => ({
      source,
      catalog: await catalogLoader(resolveSource(toCatalogSourceInput(options, source))),
    })),
  );

  if (options.installAll) {
    const selections = catalogs.flatMap(({ source, catalog }) => catalog.skills.map((skill) => ({ skill, catalog, source })));
    const seen = new Map<string, string>();
    for (const entry of selections) {
      const currentSource = `${entry.source.repo}@${entry.source.ref}`;
      const previousSource = seen.get(entry.skill.id);
      if (previousSource) {
        throw new InstallError(
          `Skill "${entry.skill.id}" exists in multiple sources: ${previousSource}, ${currentSource}. Use --repo to choose one source at a time.`,
          "SKILL_AMBIGUOUS_SOURCE",
        );
      }
      seen.set(entry.skill.id, currentSource);
    }
    return selections;
  }

  if (!requestedSkillIds.length) {
    return [];
  }

  return requestedSkillIds.map((skillId) => {
    const matches = catalogs.flatMap(({ source, catalog }) => {
      const skill = catalog.skills.find((entry) => entry.id === skillId);
      return skill ? [{ skill, catalog, source }] : [];
    });

    if (matches.length === 0) {
      throw new InstallError(`Skill "${skillId}" not found in the configured sources.`, "SKILL_NOT_FOUND");
    }

    if (matches.length > 1) {
      const sourceList = matches.map((entry) => `${entry.source.repo}@${entry.source.ref}`).join(", ");
      throw new InstallError(
        `Skill "${skillId}" exists in multiple sources: ${sourceList}. Use --repo to choose one.`,
        "SKILL_AMBIGUOUS_SOURCE",
      );
    }

    return matches[0]!;
  });
}

async function resolveInstalledCatalogSelection(
  skillId: string,
  sourceRef: string | undefined,
  options: InstallOptions,
  lockfile: LockfileState,
  catalogLoader: CatalogLoader,
): Promise<ResolvedSkillSelection | null> {
  const explicitSource = sourceRef?.startsWith("catalog:") ? parseCatalogSource(sourceRef) : null;
  const sources = explicitSource ? [explicitSource] : lockfile.sources;

  for (const source of sources) {
    const catalog = await catalogLoader(resolveSource(toCatalogSourceInput(options, source)));
    const skill = catalog.skills.find((entry) => entry.id === skillId);
    if (skill) {
      return { skill, catalog, source };
    }
  }

  return null;
}

function buildInstalledMetadata(
  skill: SkillManifest,
  context: { cwd: string; statePaths: StatePaths; installedAt: string; source: string },
): LockfileState["installed"][string] {
  return {
    name: skill.name,
    version: skill.version,
    path:
      context.statePaths.scope === "global"
        ? toPosix(path.join(context.statePaths.skillsDirPath, skill.id))
        : toPosix(path.relative(context.cwd, path.join(context.statePaths.skillsDirPath, skill.id))),
    installedAt: context.installedAt,
    compatibility: skill.compatibility,
    tags: skill.tags,
    source: context.source,
  };
}

function resolveInstalledSkillIds(lockfile: LockfileState, requestedSkillIds: string[]): string[] {
  const installedIds = Object.keys(lockfile.installed || {});
  if (installedIds.length === 0) {
    throw new InstallError("No skills installed to update.", "NO_SKILLS_INSTALLED");
  }

  if (!requestedSkillIds.length) {
    return installedIds;
  }

  const installedSet = new Set(installedIds);
  for (const skillId of requestedSkillIds) {
    if (!installedSet.has(skillId)) {
      throw new InstallError(`Skill "${skillId}" is not installed in the selected scope.`, "SKILL_NOT_INSTALLED");
    }
  }

  return requestedSkillIds;
}

function getNow(options: ProjectOptions): NowFn {
  return options.now || (() => new Date().toISOString());
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function toCatalogSourceInput(
  options: ProjectOptions,
  overrides: { repo?: string | undefined; ref?: string | undefined } = {},
): CatalogSourceInput {
  const input: CatalogSourceInput = {};

  if (options.owner) {
    input.owner = options.owner;
  }
  if (options.repoName) {
    input.repoName = options.repoName;
  }
  if (overrides.repo ?? options.repo) {
    input.repo = overrides.repo ?? options.repo;
  }
  if (overrides.ref ?? options.ref) {
    input.ref = overrides.ref ?? options.ref;
  }
  if (options.catalogPath) {
    input.catalogPath = options.catalogPath;
  }
  if (options.skillsDir) {
    input.skillsDir = options.skillsDir;
  }
  if (options.catalogUrl !== undefined) {
    input.catalogUrl = options.catalogUrl;
  }

  return input;
}

function withAgentSkillsDir<T extends { agentSkillsDir?: string | undefined }>(
  options: Omit<T, "agentSkillsDir">,
  agentSkillsDir: string | undefined,
): T {
  return {
    ...options,
    ...(agentSkillsDir ? { agentSkillsDir } : {}),
  } as T;
}

function resolveStatePathsForOptions(cwd: string, options: ProjectOptions): StatePaths {
  return getScopedStatePaths(cwd, {
    scope: options.scope || DEFAULT_INSTALL_SCOPE,
    baseDir: options.agentSkillsDir,
  });
}

function resolveInstalledSkillPath(cwd: string, skillPath: string): string {
  return path.isAbsolute(skillPath) ? skillPath : path.resolve(cwd, skillPath);
}

function toInstallError(error: unknown, fallbackMessage: string): InstallError {
  if (error instanceof InstallError) {
    return error;
  }
  if (error instanceof CliError) {
    return new InstallError(error.message, error.code);
  }

  // Preserve the underlying error code when present (HttpError, NodeJS.ErrnoException, etc.)
  // so callers can react programmatically to specific failure modes such as
  // HTTP_RATE_LIMIT, HTTP_TIMEOUT, EACCES, ENOENT, etc.
  const underlyingCode =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : null;
  const baseMessage = error instanceof Error ? error.message : String(error);
  const annotatedMessage = underlyingCode
    ? `${fallbackMessage}: ${baseMessage} (${underlyingCode})`
    : `${fallbackMessage}: ${baseMessage}`;
  return new InstallError(annotatedMessage, underlyingCode || "INSTALL_ERROR");
}

// Silence unused-import warnings while keeping the symbols available as named re-exports.
void DEFAULT_AGENT_SKILLS_DIR;
void DEFAULT_REF;
void DEFAULT_REPO;
void dedupeSources;
void normalizeSyncHistory;
void normalizeDirectManifest;
void createBaseLockfile;
void PLACEHOLDER_REPOS;
void resolveSyncAdapterIds;
type _SyncFnAlias = SyncFn;
type _DirectInstallPayloadAlias = DirectInstallPayload;
type _SyncHistoryAlias = SyncHistory;
type _SyncWriteModeAlias = SyncWriteMode;
type _InstallScopeAlias = InstallScope;
