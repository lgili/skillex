import path from "node:path";
import { pathExists } from "./fs.js";

const ADAPTERS = [
  {
    id: "codex",
    label: "OpenAI Codex",
    markers: ["AGENTS.md", ".codex", ".codex/skills"],
    syncTarget: "AGENTS.md",
    syncMode: "managed-block",
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    markers: [".github/copilot-instructions.md"],
    syncTarget: ".github/copilot-instructions.md",
    syncMode: "managed-block",
  },
  {
    id: "cline",
    label: "Cline / Roo Code",
    markers: [".cline", ".roo", ".clinerules", ".roo/rules"],
    syncTarget: ".clinerules/askill-skills.md",
    syncMode: "managed-file",
  },
  {
    id: "cursor",
    label: "Cursor",
    markers: [".cursor", ".cursor/rules", ".cursorrules"],
    syncTarget: ".cursor/rules/askill-skills.mdc",
    syncMode: "managed-file",
  },
];

export function listAdapters() {
  return ADAPTERS.map((adapter) => ({
    id: adapter.id,
    label: adapter.label,
  }));
}

export function isKnownAdapter(adapterId) {
  return ADAPTERS.some((adapter) => adapter.id === adapterId);
}

export function getAdapter(adapterId) {
  return ADAPTERS.find((adapter) => adapter.id === adapterId) || null;
}

export async function detectAdapters(cwd) {
  const detected = [];

  for (const adapter of ADAPTERS) {
    if (await adapterMatches(cwd, adapter)) {
      detected.push(adapter.id);
    }
  }

  return detected;
}

export async function resolveAdapterState(options = {}) {
  const cwd = options.cwd || process.cwd();
  const preferred = options.adapter || null;
  if (preferred && !isKnownAdapter(preferred)) {
    throw new Error(`Adapter desconhecido: ${preferred}`);
  }

  const detected = await detectAdapters(cwd);
  return {
    active: preferred || detected[0] || null,
    detected,
  };
}

async function adapterMatches(cwd, adapter) {
  for (const marker of adapter.markers) {
    if (await pathExists(path.join(cwd, marker))) {
      return true;
    }
  }
  return false;
}
