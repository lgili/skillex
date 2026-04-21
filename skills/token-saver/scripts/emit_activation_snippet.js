#!/usr/bin/env node
/**
 * emit_activation_snippet.js
 *
 * Print a ready-to-paste always-on token-saver snippet for a target agent and
 * compression level.
 *
 * Usage:
 *   node skills/token-saver/scripts/emit_activation_snippet.js --agent codex
 *   node skills/token-saver/scripts/emit_activation_snippet.js --agent claude --level lite
 *   node skills/token-saver/scripts/emit_activation_snippet.js --agent cursor --level ultra
 *
 * Exit codes:
 *   0 - success
 *   1 - error
 */

import { parseArgs } from "node:util";

const LEVEL_SNIPPETS = {
  lite: [
    "Be concise by default. Keep grammar.",
    "Lead with answer. Drop filler, pleasantries, and repeated setup.",
    "Keep code, commands, paths, URLs, and identifiers exact.",
    "Prefer bullets or short blocks over long prose.",
  ],
  full: [
    "Terse by default. Technical substance exact.",
    "Drop filler, pleasantries, hedging, and repeated restatements.",
    "Lead with answer. Short clauses or fragments OK.",
    "Keep code, commands, paths, URLs, and identifiers exact.",
    "Format: [thing] [action] [reason]. [next step].",
  ],
  ultra: [
    "Max compression by default.",
    "Keep only technical substance, action, reason, and next step.",
    "Fragments OK. No praise. No setup unless needed.",
    "Keep code, commands, paths, URLs, and identifiers exact.",
  ],
};

const AGENT_HINTS = {
  codex: "Paste into AGENTS.md or repo memory.",
  claude: "Paste into CLAUDE.md or Claude project instructions.",
  gemini: "Paste into GEMINI.md or Gemini context file.",
  copilot: "Paste into copilot instructions or AGENTS.md.",
  cursor: "Paste into a Cursor rules file.",
  cline: "Paste into .clinerules or system prompt.",
  windsurf: "Paste into a Windsurf rules file.",
};

function printHelp() {
  console.log(`Usage: emit_activation_snippet.js --agent <id> [--level <lite|full|ultra>]

Emit a ready-to-paste always-on token-saver snippet.

Options:
  --agent <id>         codex | claude | gemini | copilot | cursor | cline | windsurf
  --level <name>       lite | full | ultra (default: full)
  --comment            Include a short header comment
  -h, --help           Show this help message
`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      agent: { type: "string" },
      level: { type: "string" },
      comment: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const agent = values.agent;
  if (!agent || !(agent in AGENT_HINTS)) {
    throw new Error("Provide --agent with one of: codex, claude, gemini, copilot, cursor, cline, windsurf.");
  }

  const level = (values.level || "full").toLowerCase();
  if (!(level in LEVEL_SNIPPETS)) {
    throw new Error("Provide --level with one of: lite, full, ultra.");
  }

  const lines = [];
  if (values.comment) {
    lines.push(`# Token Saver ${level} mode for ${agent}`);
    lines.push(`# ${AGENT_HINTS[agent]}`);
    lines.push("");
  }
  lines.push(...LEVEL_SNIPPETS[level]);

  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
