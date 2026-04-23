#!/usr/bin/env node
/**
 * scaffold_compact_memory.js
 *
 * Generate a concise memory/rules file scaffold for a specific AI agent.
 *
 * Usage:
 *   node skills/token-saver/scripts/scaffold_compact_memory.js --agent codex --root .
 *   node skills/token-saver/scripts/scaffold_compact_memory.js --agent claude --project "Power Stage"
 *
 * List options that accept multiple items use `;` as the separator.
 *
 * Exit codes:
 *   0 - success
 *   1 - error
 */

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const DEFAULT_OUTPUTS = {
  codex: "AGENTS.md",
  claude: "CLAUDE.md",
  gemini: "GEMINI.md",
  copilot: path.join(".github", "copilot-instructions.md"),
  cursor: path.join(".cursor", "rules", "project-memory.mdc"),
  cline: path.join(".clinerules", "project-memory.md"),
  windsurf: path.join(".windsurf", "rules", "project-memory.md"),
};

function printHelp() {
  console.log(`Usage: scaffold_compact_memory.js --agent <id> [options]

Create a compact memory/rules scaffold for a specific AI agent.

Options:
  --agent <id>         codex | claude | gemini | copilot | cursor | cline | windsurf
  --root <path>        Repository root (default: current directory)
  --output <path>      Override output path
  --project <name>     Project name shown in the header
  --mission <text>     Durable project mission
  --stack <items>      Semicolon-separated stack bullets
  --constraints <items> Semicolon-separated hard rules
  --workflow <items>   Semicolon-separated workflow bullets
  --notes <items>      Semicolon-separated extra notes
  --overwrite          Replace an existing file
  -h, --help           Show this help message
`);
}

function splitList(value, fallback) {
  if (!value) {
    return fallback;
  }
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderBulletSection(title, items) {
  return `## ${title}\n${items.map((item) => `- ${item}`).join("\n")}\n`;
}

function agentNote(agent) {
  switch (agent) {
    case "copilot":
      return "Instruction file loaded as custom Copilot guidance. Keep it short and durable.";
    case "cursor":
    case "cline":
    case "windsurf":
      return "Rule file should stay compact because it may be consulted often during editing flows.";
    default:
      return "Memory file should contain only always-on defaults and durable constraints.";
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      agent: { type: "string" },
      root: { type: "string" },
      output: { type: "string" },
      project: { type: "string" },
      mission: { type: "string" },
      stack: { type: "string" },
      constraints: { type: "string" },
      workflow: { type: "string" },
      notes: { type: "string" },
      overwrite: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const agent = values.agent;
  if (!agent || !(agent in DEFAULT_OUTPUTS)) {
    throw new Error("Provide --agent with one of: codex, claude, gemini, copilot, cursor, cline, windsurf.");
  }

  const rootDir = path.resolve(values.root || process.cwd());
  const outputPath = path.resolve(rootDir, values.output || DEFAULT_OUTPUTS[agent]);

  try {
    await fs.access(outputPath);
    if (!values.overwrite) {
      throw new Error(`Output already exists: ${outputPath}. Re-run with --overwrite to replace it.`);
    }
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT/.test(String(error))) {
      if (error instanceof Error && error.message.startsWith("Output already exists")) {
        throw error;
      }
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const projectName = values.project || path.basename(rootDir);
  const mission = values.mission || "Deliver correct work with minimum token waste.";
  const stack = splitList(values.stack, ["List the real stack here."]);
  const constraints = splitList(values.constraints, [
    "Keep answers concise and direct.",
    "Preserve exact code, commands, paths, and identifiers.",
    "Never store secrets or tokens in repo memory files.",
  ]);
  const workflow = splitList(values.workflow, [
    "Read only the context needed for the task.",
    "Lead with the answer or decision.",
    "Validate changes before closing the task.",
  ]);
  const notes = splitList(values.notes, [agentNote(agent)]);

  const content = `# ${projectName} Memory

> Agent target: ${agent}
> Goal: compact, durable instructions that save tokens every session

${renderBulletSection("Mission", [mission]).trimEnd()}

${renderBulletSection("Defaults", [
  "Prefer short, high-signal answers.",
  "Use bullets, tables, equations, or code blocks instead of long prose when clearer.",
  "Ask follow-up questions only when blocked by missing critical context.",
]).trimEnd()}

${renderBulletSection("Stack", stack).trimEnd()}

${renderBulletSection("Constraints", constraints).trimEnd()}

${renderBulletSection("Workflow", workflow).trimEnd()}

${renderBulletSection("Notes", notes).trimEnd()}
`;

  await fs.writeFile(outputPath, content.trimEnd() + "\n", "utf8");
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
