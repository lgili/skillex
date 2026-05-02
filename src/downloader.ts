/**
 * Shared file-download helper used by both the catalog install path and the
 * direct-GitHub install path. Centralizes the per-file fetch loop and the
 * manifest write so retry / timeout / etag changes only have to land in
 * one place.
 */

import * as path from "node:path";
import { buildRawGitHubUrl } from "./catalog.js";
import { ensureDir, removePath, writeJson, writeText } from "./fs.js";
import { fetchText } from "./http.js";
import type { SkillManifest } from "./types.js";

/**
 * A skill manifest plus the resolved remote source it was downloaded from.
 * Persisted into `<skillTargetDir>/skill.json` so subsequent updates know
 * where to fetch from.
 */
export interface DownloadedSkillManifest extends SkillManifest {
  source: {
    repo: string;
    ref: string;
    path: string;
  };
}

/**
 * Downloads every file declared in a skill manifest into `targetDir`. The
 * helper wipes the target directory beforehand to ensure a clean install
 * even when a previous version had different files.
 *
 * @param args.repo - GitHub repository in `owner/repo` form.
 * @param args.ref - Branch, tag, or commit SHA.
 * @param args.skillRelPath - Path of the skill inside the repository (may be empty).
 * @param args.files - File list relative to `skillRelPath`.
 * @param args.targetDir - Local directory that will receive the files.
 */
export async function downloadSkillFiles(args: {
  repo: string;
  ref: string;
  skillRelPath: string;
  files: string[];
  targetDir: string;
}): Promise<void> {
  await removePath(args.targetDir);
  await ensureDir(args.targetDir);

  for (const relativePath of args.files) {
    const remotePath = args.skillRelPath
      ? path.posix.join(args.skillRelPath, relativePath)
      : relativePath;
    const rawUrl = buildRawGitHubUrl(args.repo, args.ref, remotePath);
    const content = await fetchText(rawUrl, { headers: { Accept: "text/plain" } });
    const localPath = path.join(args.targetDir, relativePath);
    await writeText(localPath, content);
  }
}

/**
 * Persists the downloaded manifest (with resolved source) into the skill's
 * target directory.
 */
export async function writeDownloadedManifest(
  skillTargetDir: string,
  manifest: DownloadedSkillManifest,
): Promise<void> {
  await writeJson(path.join(skillTargetDir, "skill.json"), manifest);
}
