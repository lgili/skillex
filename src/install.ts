import * as path from "node:path";
import { DEFAULT_AGENT_SKILLS_DIR, getStatePaths } from "./config.js";
import { ensureDir, pathExists, readJson, removePath, writeJson, writeText } from "./fs.js";
import { fetchText } from "./http.js";
import { buildRawGitHubUrl, loadCatalog, resolveSource } from "./catalog.js";
import { resolveAdapterState } from "./adapters.js";
import { loadInstalledSkillDocuments, syncAdapterFiles } from "./sync.js";
import type {
  CatalogData,
  CatalogLoader,
  CatalogSource,
  CatalogSourceInput,
  InitProjectResult,
  InstallSkillsResult,
  LockfileState,
  NowFn,
  ProjectOptions,
  RemoveSkillsResult,
  SkillDownloader,
  SkillManifest,
  StatePaths,
  SyncCommandResult,
  UpdateInstalledSkillsResult,
} from "./types.js";
import { InstallError } from "./types.js";

interface InstallOptions extends ProjectOptions {
  catalogLoader?: CatalogLoader;
  downloader?: SkillDownloader;
  installAll?: boolean;
}

interface DownloadedSkillManifest extends SkillManifest {
  source: {
    repo: string;
    ref: string;
    path: string;
  };
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
    const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
    const now = getNow(options);

    await ensureDir(statePaths.stateDir);

    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);
    const source = resolveSource(
      toCatalogSourceInput(options, {
        repo: options.repo || existing?.catalog?.repo,
        ref: options.ref || existing?.catalog?.ref,
      }),
    );
    const lockfile = normalizeLockfile(existing, source, now);
    lockfile.adapters = await resolveAdapterState({
      cwd,
      ...(options.adapter || lockfile.adapters.active
        ? { adapter: options.adapter || lockfile.adapters.active || undefined }
        : {}),
    });
    lockfile.catalog = {
      repo: source.repo,
      ref: source.ref,
    };
    lockfile.settings.autoSync = options.autoSync ?? lockfile.settings.autoSync;
    if (lockfile.settings.autoSync && !lockfile.adapters.active) {
      throw new InstallError(
        "Auto-sync exige um adapter ativo. Use --adapter <id> ou rode em um workspace detectavel.",
        "AUTO_SYNC_REQUIRES_ADAPTER",
      );
    }
    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);
    return { created: !existing, statePaths, lockfile };
  } catch (error) {
    throw toInstallError(error, "Falha ao inicializar o projeto");
  }
}

/**
 * Installs one or more skills into the local workspace state.
 *
 * @param requestedSkillIds - Requested skill ids.
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
    const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
    const now = getNow(options);
    const catalogLoader = options.catalogLoader || loadCatalog;
    const downloader = options.downloader || downloadSkill;

    await ensureDir(statePaths.stateDir);

    const source = await resolveProjectSource(options);
    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);
    const lockfile = normalizeLockfile(existing, source, now);
    if (!lockfile.adapters.active) {
      lockfile.adapters = await resolveAdapterState({
        cwd,
        ...(options.adapter ? { adapter: options.adapter } : {}),
      });
    }

    const catalog = await catalogLoader(source);
    const selectedSkills = selectSkills(catalog.skills, requestedSkillIds, options.installAll);

    for (const skill of selectedSkills) {
      await downloader(skill, catalog, statePaths.stateDir);
      lockfile.installed[skill.id] = buildInstalledMetadata(skill, {
        cwd,
        stateDir: statePaths.stateDir,
        installedAt: now(),
      });
    }

    lockfile.catalog = {
      repo: catalog.repo,
      ref: catalog.ref,
    };
    lockfile.updatedAt = now();

    await writeJson(statePaths.lockfilePath, lockfile);
    const autoSync = await maybeAutoSync(
      withAgentSkillsDir(
        {
          cwd,
          adapter: lockfile.adapters.active,
          enabled: lockfile.settings.autoSync,
          now,
          changed: selectedSkills.length > 0,
        },
        options.agentSkillsDir,
      ),
    );

    return {
      installedCount: selectedSkills.length,
      installedSkills: selectedSkills,
      statePaths,
      autoSync,
    };
  } catch (error) {
    throw toInstallError(error, "Falha ao instalar skills");
  }
}

/**
 * Updates installed skills from the configured remote catalog.
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
    const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
    const now = getNow(options);
    const catalogLoader = options.catalogLoader || loadCatalog;
    const downloader = options.downloader || downloadSkill;
    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

    if (!existing) {
      throw new InstallError("Nenhuma instalacao local encontrada. Rode: skillex init", "LOCKFILE_MISSING");
    }

    const source = await resolveProjectSource(options);
    const lockfile = normalizeLockfile(existing, source, now);
    const skillIds = resolveInstalledSkillIds(lockfile, requestedSkillIds);
    const catalog = await catalogLoader(source);
    const catalogById = new Map<string, SkillManifest>(catalog.skills.map((skill) => [skill.id, skill]));
    const updatedSkills: SkillManifest[] = [];
    const missingFromCatalog: string[] = [];

    for (const skillId of skillIds) {
      const skill = catalogById.get(skillId);
      if (!skill) {
        missingFromCatalog.push(skillId);
        continue;
      }

      await downloader(skill, catalog, statePaths.stateDir);
      lockfile.installed[skill.id] = buildInstalledMetadata(skill, {
        cwd,
        stateDir: statePaths.stateDir,
        installedAt: now(),
      });
      updatedSkills.push(skill);
    }

    lockfile.catalog = {
      repo: catalog.repo,
      ref: catalog.ref,
    };
    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);
    const autoSync = await maybeAutoSync(
      withAgentSkillsDir(
        {
          cwd,
          adapter: lockfile.adapters.active,
          enabled: lockfile.settings.autoSync,
          now,
          changed: updatedSkills.length > 0,
        },
        options.agentSkillsDir,
      ),
    );

    return {
      statePaths,
      updatedSkills,
      missingFromCatalog,
      autoSync,
    };
  } catch (error) {
    throw toInstallError(error, "Falha ao atualizar skills");
  }
}

/**
 * Removes installed skills from the local workspace state.
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
    const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
    const now = getNow(options);
    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

    if (!existing) {
      throw new InstallError("Nenhuma instalacao local encontrada. Rode: skillex init", "LOCKFILE_MISSING");
    }

    if (!requestedSkillIds.length) {
      throw new InstallError("Informe ao menos um skill-id para remover.", "REMOVE_REQUIRES_SKILL");
    }

    const source = await resolveProjectSource(options);
    const lockfile = normalizeLockfile(existing, source, now);
    const removedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skillId of requestedSkillIds) {
      if (!lockfile.installed[skillId]) {
        missingSkills.push(skillId);
        continue;
      }

      await removePath(path.join(statePaths.stateDir, skillId));
      delete lockfile.installed[skillId];
      removedSkills.push(skillId);
    }

    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);
    const autoSync = await maybeAutoSync(
      withAgentSkillsDir(
        {
          cwd,
          adapter: lockfile.adapters.active,
          enabled: lockfile.settings.autoSync,
          now,
          changed: removedSkills.length > 0,
        },
        options.agentSkillsDir,
      ),
    );

    return {
      statePaths,
      removedSkills,
      missingSkills,
      autoSync,
    };
  } catch (error) {
    throw toInstallError(error, "Falha ao remover skills");
  }
}

/**
 * Synchronizes installed skills to the active or requested adapter target.
 *
 * @param options - Sync options.
 * @returns Sync command result.
 * @throws {InstallError} When workspace state is missing or invalid.
 */
export async function syncInstalledSkills(options: ProjectOptions = {}): Promise<SyncCommandResult> {
  try {
    const cwd = options.cwd || process.cwd();
    const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
    const now = getNow(options);
    const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

    if (!existing) {
      throw new InstallError("Nenhuma instalacao local encontrada. Rode: skillex init", "LOCKFILE_MISSING");
    }

    const source = await resolveProjectSource(options);
    const lockfile = normalizeLockfile(existing, source, now);
    const adapterId = options.adapter || lockfile.adapters.active;
    if (!adapterId) {
      throw new InstallError(
        "Nenhum adapter ativo definido. Rode: skillex init --adapter <id> ou use --adapter.",
        "ACTIVE_ADAPTER_MISSING",
      );
    }

    const skills = await loadInstalledSkillDocuments({
      stateDir: statePaths.stateDir,
      lockfile,
    });
    const syncResult = await syncAdapterFiles(withDryRun({ cwd, adapterId, skills }, options.dryRun));

    if (options.dryRun) {
      return {
        statePaths,
        sync: {
          adapter: syncResult.adapter,
          targetPath: syncResult.targetPath,
        },
        skillCount: skills.length,
        changed: syncResult.changed,
        diff: syncResult.diff,
        dryRun: true,
      };
    }

    lockfile.sync = {
      adapter: syncResult.adapter,
      targetPath: syncResult.targetPath,
      syncedAt: now(),
    };
    lockfile.updatedAt = now();
    await writeJson(statePaths.lockfilePath, lockfile);

    return {
      statePaths,
      sync: lockfile.sync,
      skillCount: skills.length,
      changed: syncResult.changed,
      diff: syncResult.diff,
      dryRun: false,
    };
  } catch (error) {
    throw toInstallError(error, "Falha ao sincronizar skills");
  }
}

function createBaseLockfile(source: CatalogSource, now: NowFn): LockfileState {
  return {
    formatVersion: 1,
    createdAt: now(),
    updatedAt: now(),
    catalog: {
      repo: source.repo,
      ref: source.ref,
    },
    adapters: {
      active: null,
      detected: [],
    },
    settings: {
      autoSync: false,
    },
    sync: null,
    installed: {},
  };
}

function selectSkills(allSkills: SkillManifest[], requestedSkillIds: string[], installAll = false): SkillManifest[] {
  if (installAll) {
    return allSkills;
  }

  if (!requestedSkillIds.length) {
    throw new InstallError("Informe ao menos um skill-id ou use --all.", "INSTALL_REQUIRES_SKILL");
  }

  const byId = new Map<string, SkillManifest>(allSkills.map((skill) => [skill.id, skill]));
  const selected = requestedSkillIds.map((skillId) => {
    const skill = byId.get(skillId);
    if (!skill) {
      throw new InstallError(`Skill "${skillId}" nao encontrada no catalogo remoto.`, "SKILL_NOT_FOUND");
    }
    return skill;
  });

  return selected;
}

async function downloadSkill(skill: SkillManifest, catalog: CatalogData, stateDir: string): Promise<void> {
  const skillTargetDir = path.join(stateDir, skill.id);
  await removePath(skillTargetDir);
  await ensureDir(skillTargetDir);

  for (const relativePath of skill.files) {
    const remotePath = path.posix.join(skill.path, relativePath);
    const rawUrl = buildRawGitHubUrl(catalog.repo, catalog.ref, remotePath);
    const content = await fetchText(rawUrl, { headers: { Accept: "text/plain" } });
    const localPath = path.join(skillTargetDir, relativePath);
    await writeText(localPath, content);
  }

  const manifestPath = path.join(skillTargetDir, "skill.json");
  const manifest: DownloadedSkillManifest = {
    id: skill.id,
    name: skill.name,
    version: skill.version,
    description: skill.description,
    author: skill.author,
    tags: skill.tags,
    compatibility: skill.compatibility,
    entry: skill.entry,
    path: skill.path,
    files: skill.files,
    source: {
      repo: catalog.repo,
      ref: catalog.ref,
      path: skill.path,
    },
  };

  await writeJson(manifestPath, manifest);
}

/**
 * Reads the local workspace lockfile when it exists.
 *
 * @param options - Project lookup options.
 * @returns Normalized lockfile state or `null` when no install exists.
 */
export async function getInstalledSkills(options: ProjectOptions = {}): Promise<LockfileState | null> {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
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
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  const existing = await readJson<LockfileState>(statePaths.lockfilePath, null);

  return resolveSource(
    toCatalogSourceInput(options, {
      repo: options.repo || existing?.catalog?.repo,
      ref: options.ref || existing?.catalog?.ref,
    }),
  );
}

function normalizeLockfile(existing: LockfileState | null, source: CatalogSource, now: NowFn): LockfileState {
  if (!existing) {
    return createBaseLockfile(source, now);
  }

  const detectedAdapters = Array.isArray(existing.adapters)
    ? existing.adapters
    : Array.isArray(existing.adapters?.detected)
      ? existing.adapters.detected
      : [];

  const activeAdapter = Array.isArray(existing.adapters)
    ? existing.adapters[0] || null
    : existing.adapters?.active || detectedAdapters[0] || null;

  return {
    formatVersion: Number(existing.formatVersion || 1),
    createdAt: existing.createdAt || now(),
    updatedAt: existing.updatedAt || now(),
    catalog: {
      repo: existing.catalog?.repo || source.repo,
      ref: existing.catalog?.ref || source.ref,
    },
    adapters: {
      active: activeAdapter,
      detected: [...new Set(detectedAdapters.filter(Boolean))],
    },
    settings: {
      autoSync: Boolean(existing.settings?.autoSync),
    },
    sync: existing.sync || null,
    installed: existing.installed || {},
  };
}

function buildInstalledMetadata(
  skill: SkillManifest,
  context: { cwd: string; stateDir: string; installedAt: string },
): LockfileState["installed"][string] {
  return {
    name: skill.name,
    version: skill.version,
    path: toPosix(path.relative(context.cwd, path.join(context.stateDir, skill.id))),
    installedAt: context.installedAt,
    compatibility: skill.compatibility,
    tags: skill.tags,
  };
}

function resolveInstalledSkillIds(lockfile: LockfileState, requestedSkillIds: string[]): string[] {
  const installedIds = Object.keys(lockfile.installed || {});
  if (installedIds.length === 0) {
    throw new InstallError("Nenhuma skill instalada para atualizar.", "NO_SKILLS_INSTALLED");
  }

  if (!requestedSkillIds.length) {
    return installedIds;
  }

  const installedSet = new Set(installedIds);
  for (const skillId of requestedSkillIds) {
    if (!installedSet.has(skillId)) {
      throw new InstallError(`Skill "${skillId}" nao esta instalada localmente.`, "SKILL_NOT_INSTALLED");
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

async function maybeAutoSync(options: {
  cwd: string;
  agentSkillsDir?: string | undefined;
  adapter: string | null;
  enabled: boolean;
  now: NowFn;
  changed: boolean;
}): Promise<SyncCommandResult | null> {
  if (!options.enabled || !options.changed) {
    return null;
  }

  return syncInstalledSkills({
    cwd: options.cwd,
    ...(options.agentSkillsDir ? { agentSkillsDir: options.agentSkillsDir } : {}),
    ...(options.adapter ? { adapter: options.adapter } : {}),
    now: options.now,
  });
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

function withDryRun<T extends { dryRun?: boolean | undefined }>(
  options: Omit<T, "dryRun">,
  dryRun: boolean | undefined,
): T {
  return {
    ...options,
    ...(dryRun !== undefined ? { dryRun } : {}),
  } as T;
}

function toInstallError(error: unknown, fallbackMessage: string): InstallError {
  if (error instanceof InstallError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new InstallError(`${fallbackMessage}: ${message}`);
}
