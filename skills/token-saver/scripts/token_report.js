#!/usr/bin/env node
/**
 * token_report.js
 *
 * Scan common agent memory and rules files, estimate token weight, and rank the
 * highest-cost files so they can be trimmed or rewritten.
 *
 * Usage:
 *   node skills/token-saver/scripts/token_report.js --root .
 *   node skills/token-saver/scripts/token_report.js --root . --json
 *   node skills/token-saver/scripts/token_report.js --root . --max-files 10
 *
 * Exit codes:
 *   0 - success
 *   1 - error
 */

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const ALWAYS_ON_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  path.join(".github", "copilot-instructions.md"),
];

const RECURSIVE_DIRS = [
  path.join(".cursor", "rules"),
  path.join(".windsurf", "rules"),
  ".clinerules",
  path.join(".roo", "rules"),
  path.join(".claude", "commands"),
  path.join(".gemini", "commands"),
  path.join(".codex", "commands"),
];

const ALLOWED_EXTENSIONS = new Set([".md", ".mdc", ".txt", ".toml", ".yaml", ".yml", ".json"]);

function printHelp() {
  console.log(`Usage: token_report.js [--root <path>] [--json] [--max-files <n>]

Scan common agent memory and rules files, estimate token cost, and rank the
biggest files first.

Options:
  --root <path>       Repository root to scan (default: current directory)
  --json              Print machine-readable JSON
  --max-files <n>     Limit output rows (default: 20)
  -h, --help          Show this help message
`);
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function countVerboseParagraphs(text) {
  const paragraphs = text
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !/^(#|>|[-*]|\d+\.)\s/.test(paragraph));

  return paragraphs.filter((paragraph) => paragraph.split(/\s+/).length >= 80).length;
}

function classifyFile(relativePath) {
  if (/AGENTS\.md$|CLAUDE\.md$|GEMINI\.md$/i.test(relativePath)) {
    return "memory";
  }
  if (/copilot-instructions\.md$/i.test(relativePath) || /\/rules\//.test(relativePath) || /^\.clinerules/.test(relativePath)) {
    return "rules";
  }
  if (/\/commands\//.test(relativePath)) {
    return "command";
  }
  return "config";
}

function recommendationFor(entry) {
  if (entry.tokenEstimate >= 400 || entry.verboseParagraphs >= 3) {
    return "High savings candidate. Compress or split always-on content.";
  }
  if (entry.tokenEstimate >= 180 || entry.verboseParagraphs >= 1) {
    return "Medium savings candidate. Tighten prose and remove transient notes.";
  }
  return "Already fairly lean. Keep only if it is truly always-on.";
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectRecursiveFiles(rootDir, directory) {
  const absoluteDir = path.join(rootDir, directory);
  if (!(await pathExists(absoluteDir))) {
    return [];
  }

  const results = [];
  const queue = [absoluteDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(nextPath);
        continue;
      }
      if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
        continue;
      }
      results.push(nextPath);
    }
  }

  return results;
}

async function collectCandidateFiles(rootDir) {
  const files = new Set();

  for (const relativePath of ALWAYS_ON_FILES) {
    const absolutePath = path.join(rootDir, relativePath);
    if (await pathExists(absolutePath)) {
      files.add(absolutePath);
    }
  }

  for (const directory of RECURSIVE_DIRS) {
    const matches = await collectRecursiveFiles(rootDir, directory);
    for (const match of matches) {
      files.add(match);
    }
  }

  return Array.from(files);
}

async function buildReport(rootDir) {
  const candidates = await collectCandidateFiles(rootDir);
  const entries = [];

  for (const absolutePath of candidates) {
    const text = await fs.readFile(absolutePath, "utf8");
    const relativePath = path.relative(rootDir, absolutePath) || path.basename(absolutePath);
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text === "" ? 0 : text.split(/\r?\n/).length;
    const verboseParagraphs = countVerboseParagraphs(text);
    const entry = {
      file: relativePath,
      kind: classifyFile(relativePath),
      bytes: Buffer.byteLength(text, "utf8"),
      lines,
      words,
      tokenEstimate: estimateTokens(text),
      verboseParagraphs,
      recommendation: "",
    };
    entry.recommendation = recommendationFor(entry);
    entries.push(entry);
  }

  return entries.sort((left, right) => right.tokenEstimate - left.tokenEstimate || left.file.localeCompare(right.file));
}

function printTable(entries) {
  if (entries.length === 0) {
    console.log("No common memory or rules files found.");
    return;
  }

  console.log("file | kind | est_tokens | verbose_paragraphs | recommendation");
  console.log("--- | --- | ---: | ---: | ---");
  for (const entry of entries) {
    console.log(
      `${entry.file} | ${entry.kind} | ${entry.tokenEstimate} | ${entry.verboseParagraphs} | ${entry.recommendation}`,
    );
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      root: { type: "string" },
      json: { type: "boolean", default: false },
      "max-files": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const rootDir = path.resolve(values.root || process.cwd());
  const maxFiles = Math.max(1, Number.parseInt(values["max-files"] || "20", 10) || 20);
  const entries = (await buildReport(rootDir)).slice(0, maxFiles);

  if (values.json) {
    console.log(JSON.stringify({ root: rootDir, files: entries }, null, 2));
    return;
  }

  printTable(entries);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
