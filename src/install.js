import path from "node:path";
import { DEFAULT_AGENT_SKILLS_DIR, getStatePaths } from "./config.js";
import { ensureDir, pathExists, readJson, removePath, writeJson, writeText } from "./fs.js";
import { fetchText } from "./http.js";
import { buildRawGitHubUrl, loadCatalog, resolveSource } from "./catalog.js";
import { resolveAdapterState } from "./adapters.js";
import { loadInstalledSkillDocuments, syncAdapterFiles } from "./sync.js";

export async function initProject(options = {}) {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  const now = getNow(options);

  await ensureDir(statePaths.stateDir);

  const existing = await readJson(statePaths.lockfilePath, null);
  const source = resolveSource({
    ...options,
    repo: options.repo || existing?.catalog?.repo,
    ref: options.ref || existing?.catalog?.ref,
  });
  const lockfile = normalizeLockfile(existing, source, now);
  lockfile.adapters = await resolveAdapterState({
    cwd,
    adapter: options.adapter || lockfile.adapters.active,
  });
  lockfile.catalog = {
    repo: source.repo,
    ref: source.ref,
  };
  lockfile.settings.autoSync = options.autoSync ?? lockfile.settings.autoSync;
  if (lockfile.settings.autoSync && !lockfile.adapters.active) {
    throw new Error("Auto-sync exige um adapter ativo. Use --adapter <id> ou rode em um workspace detectavel.");
  }
  lockfile.updatedAt = now();
  await writeJson(statePaths.lockfilePath, lockfile);
  return { created: !existing, statePaths, lockfile };
}

export async function installSkills(requestedSkillIds, options = {}) {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  const now = getNow(options);
  const catalogLoader = options.catalogLoader || loadCatalog;
  const downloader = options.downloader || downloadSkill;

  await ensureDir(statePaths.stateDir);

  const source = await resolveProjectSource(options);
  const existing = await readJson(statePaths.lockfilePath, null);
  const lockfile = normalizeLockfile(existing, source, now);
  if (!lockfile.adapters.active) {
    lockfile.adapters = await resolveAdapterState({ cwd, adapter: options.adapter });
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
  const autoSync = await maybeAutoSync({
    cwd,
    agentSkillsDir: options.agentSkillsDir,
    adapter: lockfile.adapters.active,
    enabled: lockfile.settings.autoSync,
    now,
    changed: selectedSkills.length > 0,
  });

  return {
    installedCount: selectedSkills.length,
    installedSkills: selectedSkills,
    statePaths,
    autoSync,
  };
}

export async function updateInstalledSkills(requestedSkillIds, options = {}) {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  const now = getNow(options);
  const catalogLoader = options.catalogLoader || loadCatalog;
  const downloader = options.downloader || downloadSkill;
  const existing = await readJson(statePaths.lockfilePath, null);

  if (!existing) {
    throw new Error("Nenhuma instalacao local encontrada. Rode: askill init");
  }

  const source = await resolveProjectSource(options);
  const lockfile = normalizeLockfile(existing, source, now);
  const skillIds = resolveInstalledSkillIds(lockfile, requestedSkillIds);
  const catalog = await catalogLoader(source);
  const catalogById = new Map(catalog.skills.map((skill) => [skill.id, skill]));
  const updatedSkills = [];
  const missingFromCatalog = [];

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
  const autoSync = await maybeAutoSync({
    cwd,
    agentSkillsDir: options.agentSkillsDir,
    adapter: lockfile.adapters.active,
    enabled: lockfile.settings.autoSync,
    now,
    changed: updatedSkills.length > 0,
  });

  return {
    statePaths,
    updatedSkills,
    missingFromCatalog,
    autoSync,
  };
}

export async function removeSkills(requestedSkillIds, options = {}) {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  const now = getNow(options);
  const existing = await readJson(statePaths.lockfilePath, null);

  if (!existing) {
    throw new Error("Nenhuma instalacao local encontrada. Rode: askill init");
  }

  if (!requestedSkillIds.length) {
    throw new Error("Informe ao menos um skill-id para remover.");
  }

  const source = await resolveProjectSource(options);
  const lockfile = normalizeLockfile(existing, source, now);
  const removedSkills = [];
  const missingSkills = [];

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
  const autoSync = await maybeAutoSync({
    cwd,
    agentSkillsDir: options.agentSkillsDir,
    adapter: lockfile.adapters.active,
    enabled: lockfile.settings.autoSync,
    now,
    changed: removedSkills.length > 0,
  });

  return {
    statePaths,
    removedSkills,
    missingSkills,
    autoSync,
  };
}

export async function syncInstalledSkills(options = {}) {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  const now = getNow(options);
  const existing = await readJson(statePaths.lockfilePath, null);

  if (!existing) {
    throw new Error("Nenhuma instalacao local encontrada. Rode: askill init");
  }

  const source = await resolveProjectSource(options);
  const lockfile = normalizeLockfile(existing, source, now);
  const adapterId = options.adapter || lockfile.adapters.active;
  if (!adapterId) {
    throw new Error("Nenhum adapter ativo definido. Rode: askill init --adapter <id> ou use --adapter.");
  }

  const skills = await loadInstalledSkillDocuments({
    stateDir: statePaths.stateDir,
    lockfile,
  });
  const syncResult = await syncAdapterFiles({
    cwd,
    adapterId,
    skills,
    dryRun: options.dryRun,
  });

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
}

function createBaseLockfile(source, now) {
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

function selectSkills(allSkills, requestedSkillIds, installAll = false) {
  if (installAll) {
    return allSkills;
  }

  if (!requestedSkillIds.length) {
    throw new Error("Informe ao menos um skill-id ou use --all.");
  }

  const byId = new Map(allSkills.map((skill) => [skill.id, skill]));
  const selected = requestedSkillIds.map((skillId) => {
    const skill = byId.get(skillId);
    if (!skill) {
      throw new Error(`Skill "${skillId}" nao encontrada no catalogo remoto.`);
    }
    return skill;
  });

  return selected;
}

async function downloadSkill(skill, catalog, stateDir) {
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
  const manifest = {
    id: skill.id,
    name: skill.name,
    version: skill.version,
    description: skill.description,
    author: skill.author,
    tags: skill.tags,
    compatibility: skill.compatibility,
    entry: skill.entry,
    files: skill.files,
    source: {
      repo: catalog.repo,
      ref: catalog.ref,
      path: skill.path,
    },
  };

  await writeJson(manifestPath, manifest);
}

export async function getInstalledSkills(options = {}) {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  if (!(await pathExists(statePaths.lockfilePath))) {
    return null;
  }
  const source = resolveSource({
    ...options,
    repo: options.repo,
    ref: options.ref,
  });
  const existing = await readJson(statePaths.lockfilePath, null);
  if (!existing) {
    return null;
  }
  return normalizeLockfile(existing, source, getNow(options));
}

export async function resolveProjectSource(options = {}) {
  const cwd = options.cwd || process.cwd();
  const statePaths = getStatePaths(cwd, options.agentSkillsDir || DEFAULT_AGENT_SKILLS_DIR);
  const existing = await readJson(statePaths.lockfilePath, null);

  return resolveSource({
    ...options,
    repo: options.repo || existing?.catalog?.repo,
    ref: options.ref || existing?.catalog?.ref,
  });
}

function normalizeLockfile(existing, source, now) {
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

function buildInstalledMetadata(skill, context) {
  return {
    name: skill.name,
    version: skill.version,
    path: toPosix(path.relative(context.cwd, path.join(context.stateDir, skill.id))),
    installedAt: context.installedAt,
    compatibility: skill.compatibility,
    tags: skill.tags,
  };
}

function resolveInstalledSkillIds(lockfile, requestedSkillIds) {
  const installedIds = Object.keys(lockfile.installed || {});
  if (installedIds.length === 0) {
    throw new Error("Nenhuma skill instalada para atualizar.");
  }

  if (!requestedSkillIds.length) {
    return installedIds;
  }

  const installedSet = new Set(installedIds);
  for (const skillId of requestedSkillIds) {
    if (!installedSet.has(skillId)) {
      throw new Error(`Skill "${skillId}" nao esta instalada localmente.`);
    }
  }

  return requestedSkillIds;
}

function getNow(options) {
  return options.now || (() => new Date().toISOString());
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function maybeAutoSync(options) {
  if (!options.enabled || !options.changed) {
    return null;
  }

  return syncInstalledSkills({
    cwd: options.cwd,
    agentSkillsDir: options.agentSkillsDir,
    adapter: options.adapter,
    now: options.now,
  });
}
