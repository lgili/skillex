import path from "node:path";
import { listAdapters } from "./adapters.js";
import { loadCatalog, searchCatalogSkills } from "./catalog.js";
import {
  getInstalledSkills,
  initProject,
  installSkills,
  removeSkills,
  resolveProjectSource,
  syncInstalledSkills,
  updateInstalledSkills,
} from "./install.js";

export async function main(argv) {
  const { command, positionals, flags } = parseArgs(argv);

  switch (command) {
    case "help":
    case undefined:
      printHelp();
      return;
    case "init":
      await handleInit(flags);
      return;
    case "list":
      await handleList(flags);
      return;
    case "search":
      await handleSearch(positionals, flags);
      return;
    case "install":
      await handleInstall(positionals, flags);
      return;
    case "update":
      await handleUpdate(positionals, flags);
      return;
    case "remove":
      await handleRemove(positionals, flags);
      return;
    case "sync":
      await handleSync(flags);
      return;
    case "status":
      await handleStatus(flags);
      return;
    default:
      throw new Error(`Comando desconhecido: ${command}`);
  }
}

async function handleInit(flags) {
  const result = await initProject(commonOptions(flags));
  if (result.created) {
    console.log(`Inicializado em ${result.statePaths.stateDir}`);
  } else {
    console.log(`Ja existe configuracao em ${result.statePaths.stateDir}`);
  }

  if (result.lockfile.adapters.active) {
    console.log(`Adapter ativo: ${result.lockfile.adapters.active}`);
  } else {
    console.log("Nenhum adapter detectado.");
  }
  console.log(`Auto-sync: ${result.lockfile.settings.autoSync ? "enabled" : "disabled"}`);
}

async function handleList(flags) {
  const catalog = await loadCatalog(await resolveProjectSource(commonOptions(flags)));
  const rows = catalog.skills.map((skill) => ({
    id: skill.id,
    version: skill.version,
    name: skill.name,
    description: truncate(skill.description, 96),
  }));

  if (rows.length === 0) {
    console.log("Nenhuma skill encontrada.");
    return;
  }

  console.log(`Catalogo: ${catalog.repo}@${catalog.ref}`);
  printTable(rows);
}

async function handleSearch(positionals, flags) {
  const catalog = await loadCatalog(await resolveProjectSource(commonOptions(flags)));
  const filtered = searchCatalogSkills(catalog.skills, {
    query: positionals.join(" "),
    compatibility: flags.compatibility,
    tags: flags.tag,
  });

  if (filtered.length === 0) {
    console.log("Nenhuma skill corresponde aos filtros informados.");
    return;
  }

  console.log(`Catalogo: ${catalog.repo}@${catalog.ref}`);
  printTable(
    filtered.map((skill) => ({
      id: skill.id,
      version: skill.version,
      compatibility: skill.compatibility.join(","),
      description: truncate(skill.description, 72),
    })),
  );
}

async function handleInstall(positionals, flags) {
  const installAll = Boolean(flags.all);
  const result = await installSkills(positionals, {
    ...commonOptions(flags),
    installAll,
  });

  console.log(`Instaladas ${result.installedCount} skill(s) em ${result.statePaths.stateDir}`);
  for (const skill of result.installedSkills) {
    console.log(`- ${skill.id}@${skill.version}`);
  }
  printAutoSyncResult(result.autoSync);
}

async function handleUpdate(positionals, flags) {
  const result = await updateInstalledSkills(positionals, commonOptions(flags));
  if (result.updatedSkills.length === 0) {
    console.log("Nenhuma skill atualizada.");
  } else {
    console.log(`Atualizadas ${result.updatedSkills.length} skill(s) em ${result.statePaths.stateDir}`);
    for (const skill of result.updatedSkills) {
      console.log(`- ${skill.id}@${skill.version}`);
    }
  }

  for (const skillId of result.missingFromCatalog) {
    console.log(`- ${skillId} nao existe mais no catalogo remoto`);
  }
  printAutoSyncResult(result.autoSync);
}

async function handleRemove(positionals, flags) {
  const result = await removeSkills(positionals, commonOptions(flags));
  if (result.removedSkills.length > 0) {
    console.log(`Removidas ${result.removedSkills.length} skill(s) de ${result.statePaths.stateDir}`);
    for (const skillId of result.removedSkills) {
      console.log(`- ${skillId}`);
    }
  }

  for (const skillId of result.missingSkills) {
    console.log(`- ${skillId} nao esta instalado`);
  }
  printAutoSyncResult(result.autoSync);
}

async function handleSync(flags) {
  const result = await syncInstalledSkills(commonOptions(flags));
  if (result.dryRun) {
    console.log(`Preview de ${result.skillCount} skill(s) para ${result.sync.adapter}`);
    console.log(`Arquivo alvo: ${result.sync.targetPath}`);
    process.stdout.write(result.diff);
    return;
  }

  console.log(`Sincronizadas ${result.skillCount} skill(s) para ${result.sync.adapter}`);
  console.log(`Arquivo alvo: ${result.sync.targetPath}`);
  if (!result.changed) {
    console.log("Sem alteracoes no arquivo alvo.");
  }
}

async function handleStatus(flags) {
  const state = await getInstalledSkills(commonOptions(flags));
  if (!state) {
    console.log("Nenhuma instalacao local encontrada. Rode: askill init");
    return;
  }

  const installedEntries = Object.entries(state.installed || {});
  console.log(`Catalogo configurado: ${state.catalog.repo}@${state.catalog.ref}`);
  console.log(`Adapter ativo: ${state.adapters.active || "(nenhum)"}`);
  console.log(`Auto-sync: ${state.settings.autoSync ? "enabled" : "disabled"}`);
  if (state.adapters.detected.length > 0) {
    console.log(`Adapters detectados: ${state.adapters.detected.join(", ")}`);
  }
  if (state.sync) {
    console.log(`Ultimo sync: ${state.sync.adapter} -> ${state.sync.targetPath} em ${state.sync.syncedAt}`);
  }
  if (installedEntries.length === 0) {
    console.log("Nenhuma skill instalada.");
    return;
  }

  printTable(
    installedEntries.map(([id, metadata]) => ({
      id,
      version: metadata.version,
      installedAt: metadata.installedAt,
    })),
  );
}

function commonOptions(flags) {
  return {
    cwd: path.resolve(flags.cwd || process.cwd()),
    repo: flags.repo,
    ref: flags.ref,
    catalogPath: flags["catalog-path"],
    catalogUrl: flags["catalog-url"],
    skillsDir: flags["skills-dir"],
    agentSkillsDir: flags["agent-skills-dir"],
    adapter: flags.adapter,
    autoSync: parseBooleanFlag(flags["auto-sync"]),
    dryRun: parseBooleanFlag(flags["dry-run"]) || false,
  };
}

function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  let command;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!command && !token.startsWith("-")) {
      command = token;
      continue;
    }

    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      if (inlineValue !== undefined) {
        flags[rawKey] = inlineValue;
        continue;
      }

      const next = argv[index + 1];
      if (!next || next.startsWith("-")) {
        flags[rawKey] = true;
        continue;
      }

      flags[rawKey] = next;
      index += 1;
      continue;
    }

    positionals.push(token);
  }

  return {
    command,
    positionals,
    flags,
  };
}

function printHelp() {
  console.log(`askill

Comandos:
  askill init --repo owner/repo [--ref main]
  askill list --repo owner/repo [--ref main]
  askill search [texto] --repo owner/repo [--compatibility codex]
  askill install <skill-id...> --repo owner/repo [--ref main]
  askill install --all --repo owner/repo [--ref main]
  askill update [skill-id...]
  askill remove <skill-id...>
  askill sync [--adapter codex] [--dry-run]
  askill status

Flags:
  --repo               Repositorio GitHub no formato owner/repo
  --ref                Branch, tag ou commit. Padrao: main
  --catalog-path       Caminho do catalogo no repo. Padrao: catalog.json
  --catalog-url        URL direta para o catalogo remoto
  --skills-dir         Pasta remota das skills. Padrao: skills
  --agent-skills-dir   Pasta local gerenciada. Padrao: .agent-skills
  --cwd                Projeto alvo. Padrao: diretorio atual
  --adapter            Adapter forçado: ${listAdapters().map((adapter) => adapter.id).join(", ")}
  --auto-sync          Habilita sync automatico no workspace
  --dry-run            Faz preview/diff sem escrever no disco
  --compatibility      Filtra skills por compatibilidade
  --tag                Filtra skills por tags
  --all                Instala todas as skills do catalogo
`);
}

function printTable(rows) {
  const columns = Object.keys(rows[0]);
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => String(row[column] ?? "").length)),
  );

  console.log(columns.map((column, index) => column.padEnd(widths[index])).join("  "));
  console.log(widths.map((size) => "-".repeat(size)).join("  "));
  for (const row of rows) {
    console.log(
      columns
        .map((column, index) => String(row[column] ?? "").padEnd(widths[index]))
        .join("  "),
    );
  }
}

function truncate(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function parseBooleanFlag(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === true) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Valor booleano invalido: ${value}`);
}

function printAutoSyncResult(result) {
  if (!result) {
    return;
  }

  const suffix = result.changed ? "" : " (sem alteracoes)";
  console.log(`Auto-sync: ${result.sync.adapter} -> ${result.sync.targetPath}${suffix}`);
}
