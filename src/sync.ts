import * as path from "node:path";
import { ensureDir, readJson, readText, removePath, writeText } from "./fs.js";
import { getAdapter } from "./adapters.js";
import type {
  InstalledSkillDocument,
  LockfileState,
  PreparedSyncResult,
  SyncOptions,
  SyncResult,
} from "./types.js";
import { SyncError } from "./types.js";

const MANAGED_START = "<!-- SKILLEX:START -->";
const MANAGED_END = "<!-- SKILLEX:END -->";
const LEGACY_MANAGED_BLOCKS = [
  {
    start: "<!-- ASKILL:START -->",
    end: "<!-- ASKILL:END -->",
  },
];

/**
 * Loads installed skill documents from the local workspace state directory.
 *
 * @param context - State directory and lockfile context.
 * @returns Installed skill documents used for sync rendering.
 */
export async function loadInstalledSkillDocuments(context: {
  stateDir: string;
  lockfile: LockfileState;
}): Promise<InstalledSkillDocument[]> {
  const installedEntries = Object.entries(context.lockfile.installed || {}).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  const documents: InstalledSkillDocument[] = [];
  for (const [skillId, metadata] of installedEntries) {
    const skillDir = path.join(context.stateDir, skillId);
    const manifest =
      (await readJson<{ entry?: string; name?: string; version?: string }>(path.join(skillDir, "skill.json"), {})) ||
      {};
    const entry = manifest.entry || "SKILL.md";
    const rawContent = (await readText(path.join(skillDir, entry), "")) || "";
    documents.push({
      id: skillId,
      name: manifest.name || metadata.name || skillId,
      version: manifest.version || metadata.version || "0.1.0",
      body: normalizeSkillContent(rawContent),
    });
  }

  return documents;
}

/**
 * Synchronizes installed skills into the target file consumed by an adapter.
 *
 * @param options - Sync execution options.
 * @returns Final sync result.
 * @throws {SyncError} When sync preparation or file writing fails.
 */
export async function syncAdapterFiles(options: SyncOptions): Promise<SyncResult> {
  try {
    const prepared = await prepareSyncAdapterFiles(options);
    if (!options.dryRun) {
      await ensureDir(path.dirname(prepared.absoluteTargetPath));
      await writeText(prepared.absoluteTargetPath, prepared.nextContent);
      for (const cleanupPath of prepared.cleanupPaths) {
        await removePath(cleanupPath);
      }
    }

    return {
      adapter: prepared.adapter,
      targetPath: prepared.targetPath,
      changed: prepared.changed,
      diff: prepared.diff,
    };
  } catch (error) {
    if (error instanceof SyncError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new SyncError(`Falha ao sincronizar adapter ${options.adapterId}: ${message}`);
  }
}

/**
 * Prepares the next sync state without writing files.
 *
 * @param options - Sync preparation options.
 * @returns Prepared sync state with before/after content and diff.
 * @throws {SyncError} When the adapter cannot be prepared.
 */
export async function prepareSyncAdapterFiles(
  options: Omit<SyncOptions, "dryRun">,
): Promise<PreparedSyncResult> {
  const adapter = getAdapter(options.adapterId);

  const targetPath = path.join(options.cwd, adapter.syncTarget);
  const relativeTargetPath = toPosix(path.relative(options.cwd, targetPath));
  const consolidatedBody = renderInstalledSkills(options.skills);
  const fileContent = buildAdapterFileContent(adapter.id, consolidatedBody);
  const existing = (await readText(targetPath, "")) || "";
  const nextContent =
    adapter.syncMode === "managed-block" ? upsertManagedBlock(existing, fileContent) : fileContent;
  const changed = normalizeComparableText(existing) !== normalizeComparableText(nextContent);
  const cleanupPaths = (adapter.legacySyncTargets || [])
    .map((relativePath) => path.join(options.cwd, relativePath))
    .filter((absolutePath) => absolutePath !== targetPath);

  return {
    adapter: adapter.id,
    absoluteTargetPath: targetPath,
    targetPath: relativeTargetPath,
    cleanupPaths,
    changed,
    currentContent: existing,
    nextContent,
    diff: createTextDiff(existing, nextContent, relativeTargetPath),
  };
}

/**
 * Renders installed skills into a single markdown document.
 *
 * @param skills - Installed skill documents.
 * @returns Consolidated markdown body.
 */
export function renderInstalledSkills(skills: InstalledSkillDocument[]): string {
  const sections = skills.map(renderSkillSection).filter(Boolean);
  const lines = [
    "## Skillex Managed Skills",
    "",
    "> Conteudo gerado por `skillex sync`. Edicoes aqui podem ser sobrescritas.",
    "",
  ];

  if (sections.length === 0) {
    lines.push("Nenhuma skill instalada no momento.");
  } else {
    lines.push(sections.join("\n\n---\n\n"));
  }

  return `${lines.join("\n").trim()}\n`;
}

function renderSkillSection(skill: InstalledSkillDocument): string {
  const body = skill.body.trim() || "_Sem conteudo._";
  return [`### ${skill.name} (\`${skill.id}@${skill.version}\`)`, "", body].join("\n");
}

function buildAdapterFileContent(adapterId: string, body: string): string {
  switch (adapterId) {
    case "cursor":
      return [
        "---",
        'description: "Skillex managed skills"',
        "alwaysApply: true",
        "---",
        "",
        body.trim(),
        "",
      ].join("\n");
    case "windsurf":
      return [
        "---",
        'description: "Skillex managed skills"',
        "trigger: always_on",
        "---",
        "",
        body.trim(),
        "",
      ].join("\n");
    case "cline":
      return body;
    case "codex":
    case "copilot":
    case "claude":
    case "gemini":
      return [MANAGED_START, body.trim(), MANAGED_END, ""].join("\n");
    default:
      throw new SyncError(`Adapter desconhecido: ${adapterId}`, "SYNC_ADAPTER_UNKNOWN");
  }
}

function upsertManagedBlock(existingContent: string, blockContent: string): string {
  for (const managedBlock of [{ start: MANAGED_START, end: MANAGED_END }, ...LEGACY_MANAGED_BLOCKS]) {
    const blockPattern = new RegExp(
      `${escapeRegExp(managedBlock.start)}[\\s\\S]*?${escapeRegExp(managedBlock.end)}\\n?`,
      "m",
    );
    if (blockPattern.test(existingContent)) {
      return existingContent.replace(blockPattern, `${blockContent}\n`);
    }
  }

  const trimmed = existingContent.trimEnd();
  if (!trimmed) {
    return `${blockContent}\n`;
  }

  return `${trimmed}\n\n${blockContent}\n`;
}

function normalizeSkillContent(content: string): string {
  const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
  const withoutTopHeading = withoutFrontmatter.replace(/^#\s+.+\n+/, "");
  return withoutTopHeading.trim();
}

function createTextDiff(currentContent: string, nextContent: string, targetPath: string): string {
  if (normalizeComparableText(currentContent) === normalizeComparableText(nextContent)) {
    return `Sem alteracoes em ${targetPath}.\n`;
  }

  const currentLines = splitLines(currentContent);
  const nextLines = splitLines(nextContent);
  const operations = diffLines(currentLines, nextLines);
  const output = [`--- atual/${targetPath}`, `+++ novo/${targetPath}`];

  for (const operation of operations) {
    output.push(`${operation.type}${operation.line}`);
  }

  return `${output.join("\n")}\n`;
}

function splitLines(content: string): string[] {
  if (!content) {
    return [];
  }

  const lines = content.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function normalizeComparableText(content: string): string {
  if (!content) {
    return "";
  }

  return content.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

function diffLines(leftLines: string[], rightLines: string[]): Array<{ type: string; line: string }> {
  const rowCount = leftLines.length + 1;
  const columnCount = rightLines.length + 1;
  const matrix = Array.from({ length: rowCount }, () => Array(columnCount).fill(0));

  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      const leftLine = leftLines[leftIndex]!;
      const rightLine = rightLines[rightIndex]!;
      const currentRow = matrix[leftIndex]!;
      const nextRow = matrix[leftIndex + 1]!;
      if (leftLine === rightLine) {
        currentRow[rightIndex] = (nextRow[rightIndex + 1] ?? 0) + 1;
      } else {
        currentRow[rightIndex] = Math.max(nextRow[rightIndex] ?? 0, currentRow[rightIndex + 1] ?? 0);
      }
    }
  }

  const operations: Array<{ type: string; line: string }> = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length && rightIndex < rightLines.length) {
    const leftLine = leftLines[leftIndex]!;
    const rightLine = rightLines[rightIndex]!;
    if (leftLine === rightLine) {
      operations.push({ type: " ", line: leftLine });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const currentRow = matrix[leftIndex]!;
    const nextRow = matrix[leftIndex + 1]!;
    if ((nextRow[rightIndex] ?? 0) >= (currentRow[rightIndex + 1] ?? 0)) {
      operations.push({ type: "-", line: leftLine });
      leftIndex += 1;
    } else {
      operations.push({ type: "+", line: rightLine });
      rightIndex += 1;
    }
  }

  while (leftIndex < leftLines.length) {
    operations.push({ type: "-", line: leftLines[leftIndex]! });
    leftIndex += 1;
  }

  while (rightIndex < rightLines.length) {
    operations.push({ type: "+", line: rightLines[rightIndex]! });
    rightIndex += 1;
  }

  return operations;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
