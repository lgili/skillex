/**
 * Direct-GitHub install path. Parallels the catalog install path but reads
 * `skill.json` (or `SKILL.md` frontmatter) directly from a GitHub
 * repository, allowing users to install skills that are not yet published
 * in any catalog source.
 */

import { buildRawGitHubUrl } from "./catalog.js";
import { confirmAction } from "./confirm.js";
import {
  downloadSkillFiles,
  writeDownloadedManifest,
  type DownloadedSkillManifest,
} from "./downloader.js";
import { fetchOptionalJson, fetchOptionalText } from "./http.js";
import { parseSkillFrontmatter } from "./skill.js";
import * as path from "node:path";
import type { DirectGitHubRef, SkillManifest } from "./types.js";
import { CliError, InstallError } from "./types.js";

/** Refs in `owner/repo[@ref]` form must match this character set. */
const ALLOWED_REF_PATTERN = /^[A-Za-z0-9_.\-/]+$/;

/** Resolved direct-install payload as returned by `fetchDirectGitHubSkill`. */
export interface DirectInstallPayload {
  manifest: SkillManifest;
  repo: string;
  ref: string;
  source: string;
}

/** Trust-prompt options accepted by `confirmDirectInstall`. */
export interface ConfirmDirectInstallOptions {
  trust?: boolean | undefined;
  confirm?: (() => Promise<boolean>) | undefined;
  warn?: ((message: string) => void) | undefined;
}

/**
 * Parses a direct GitHub install reference in `owner/repo[@ref]` format.
 *
 * The ref segment (when present) MUST match `^[A-Za-z0-9_.\-/]+$`. Empty
 * refs (e.g. `owner/repo@`) and refs containing whitespace, newlines, or
 * shell metacharacters are rejected with `CliError("INVALID_DIRECT_REF")`
 * rather than silently defaulting to `main`.
 *
 * @param input - User-supplied install argument.
 * @returns Parsed direct GitHub reference or `null` when the value is not a direct ref.
 * @throws {CliError} When the value looks like a direct ref but the ref portion is invalid.
 */
export function parseDirectGitHubRef(input: string): DirectGitHubRef | null {
  if (!input || input.startsWith("http://") || input.startsWith("https://")) {
    return null;
  }

  const trimmed = input.trim();
  // Detect "owner/repo[@maybeRef]" shape. The ref capture is greedy so we can
  // validate exactly what the user typed (including empty values after `@`).
  const shape = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(@.*)?$/);
  if (!shape) {
    return null;
  }

  const owner = shape[1]!;
  const repo = shape[2]!;
  const refSuffix = shape[3]; // e.g. "@v1.0.0" or "@" or undefined

  let ref = "main";
  if (refSuffix !== undefined) {
    const rawRef = refSuffix.slice(1); // drop leading "@"
    if (rawRef.length === 0) {
      throw new CliError(
        `Invalid direct install ref: empty ref after "@" in "${trimmed}". Use owner/repo or owner/repo@<branch|tag>.`,
        "INVALID_DIRECT_REF",
      );
    }
    if (!ALLOWED_REF_PATTERN.test(rawRef)) {
      throw new CliError(
        `Invalid direct install ref: "${rawRef}" contains disallowed characters. Allowed: letters, digits, "_", ".", "-", "/".`,
        "INVALID_DIRECT_REF",
      );
    }
    ref = rawRef;
  }

  return { owner, repo, ref };
}

/**
 * Parses a `github:owner/repo@ref` source string from the lockfile back into a
 * `DirectGitHubRef`.
 */
export function parseGitHubSource(source: string): DirectGitHubRef | null {
  if (!source.startsWith("github:")) {
    return null;
  }

  const withoutPrefix = source.slice("github:".length);
  const separatorIndex = withoutPrefix.lastIndexOf("@");
  if (separatorIndex <= 0) {
    return null;
  }

  return parseDirectGitHubRef(
    `${withoutPrefix.slice(0, separatorIndex)}@${withoutPrefix.slice(separatorIndex + 1)}`,
  );
}

/**
 * Fetches the manifest for a direct-install skill, falling back to SKILL.md
 * frontmatter when no `skill.json` is present at the repository root.
 */
export async function fetchDirectGitHubSkill(reference: DirectGitHubRef): Promise<DirectInstallPayload> {
  const repoId = `${reference.owner}/${reference.repo}`;
  const manifestUrl = buildRawGitHubUrl(repoId, reference.ref, "skill.json");
  const manifest =
    await fetchOptionalJson<Partial<SkillManifest> & { scripts?: Record<string, string> }>(manifestUrl, {
      headers: { Accept: "application/json" },
    });

  if (manifest) {
    return {
      repo: repoId,
      ref: reference.ref,
      source: `github:${repoId}@${reference.ref}`,
      manifest: normalizeDirectManifest(manifest, reference),
    };
  }

  const skillMarkdown = await fetchOptionalText(buildRawGitHubUrl(repoId, reference.ref, "SKILL.md"), {
    headers: { Accept: "text/plain" },
  });
  if (!skillMarkdown) {
    throw new InstallError(`No skill.json or SKILL.md found at ${repoId}@${reference.ref}.`, "DIRECT_SKILL_NOT_FOUND");
  }

  const frontmatter = parseSkillFrontmatter(skillMarkdown);
  return {
    repo: repoId,
    ref: reference.ref,
    source: `github:${repoId}@${reference.ref}`,
    manifest: {
      id: normalizeRepoSkillId(reference.repo),
      name: frontmatter.name || toTitleCase(reference.repo),
      version: "0.1.0",
      description: frontmatter.description || `Skill instalada diretamente de ${repoId}.`,
      author: reference.owner,
      tags: [],
      compatibility: [],
      entry: "SKILL.md",
      path: "",
      files: ["SKILL.md"],
    },
  };
}

/**
 * Downloads the resolved direct-install skill into the managed skills store.
 */
export async function downloadDirectGitHubSkill(
  skill: DirectInstallPayload,
  skillsDirPath: string,
): Promise<void> {
  const skillTargetDir = path.join(skillsDirPath, skill.manifest.id);
  await downloadSkillFiles({
    repo: skill.repo,
    ref: skill.ref,
    skillRelPath: skill.manifest.path,
    files: skill.manifest.files,
    targetDir: skillTargetDir,
  });

  const downloaded: DownloadedSkillManifest = {
    ...skill.manifest,
    source: {
      repo: skill.repo,
      ref: skill.ref,
      path: skill.manifest.path,
    },
  };
  await writeDownloadedManifest(skillTargetDir, downloaded);
}

/**
 * Promotes a partial direct-install manifest into a fully-typed `SkillManifest`,
 * providing safe defaults for missing fields.
 */
export function normalizeDirectManifest(
  manifest: Partial<SkillManifest> & { scripts?: Record<string, string> },
  reference: DirectGitHubRef,
): SkillManifest {
  return {
    id: manifest.id || normalizeRepoSkillId(reference.repo),
    name: manifest.name || toTitleCase(reference.repo),
    version: manifest.version || "0.1.0",
    description: manifest.description || `Skill instalada diretamente de ${reference.owner}/${reference.repo}.`,
    author: manifest.author || reference.owner,
    tags: Array.isArray(manifest.tags) ? manifest.tags : [],
    compatibility: Array.isArray(manifest.compatibility) ? manifest.compatibility : [],
    entry: manifest.entry || "SKILL.md",
    path: manifest.path || "",
    files: Array.isArray(manifest.files) && manifest.files.length > 0 ? manifest.files : [manifest.entry || "SKILL.md"],
    ...(manifest.scripts ? { scripts: manifest.scripts } : {}),
  };
}

/**
 * Prompts the user to confirm a direct GitHub install (skipped when the
 * caller passes `trust: true`). Throws `InstallError` with code
 * `INSTALL_CANCELLED` on rejection.
 */
export async function confirmDirectInstall(
  skillRef: string,
  options: ConfirmDirectInstallOptions,
): Promise<void> {
  const warning = `Warning: ${skillRef} will be installed directly from GitHub and has not been verified by the active catalog.`;
  (options.warn || console.error)(warning);

  const confirm = options.confirm || (() => confirmAction("Continuar com a instalacao direta?"));
  const accepted = await confirm();
  if (!accepted) {
    throw new InstallError("Instalacao direta cancelada pelo usuario.", "INSTALL_CANCELLED");
  }
}

function normalizeRepoSkillId(repo: string): string {
  return repo.trim().toLowerCase();
}

function toTitleCase(skillId: string): string {
  return skillId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
