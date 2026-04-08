import * as os from "node:os";
import * as path from "node:path";
import type { InstallScope, StatePaths } from "./types.js";

export const DEFAULT_AGENT_SKILLS_DIR = ".agent-skills";
export const DEFAULT_INSTALL_SCOPE: InstallScope = "local";

/**
 * Returns the default user-level Skillex directory (`~/.skillex`).
 */
export function getDefaultSkillsDir(): string {
  return path.join(os.homedir(), ".skillex");
}
export const DEFAULT_LOCKFILE = "skills.json";
export const DEFAULT_LOCAL_SKILLS_DIR = "skills";
export const DEFAULT_GENERATED_DIR = "generated";
export const DEFAULT_CATALOG_PATH = "catalog.json";
export const DEFAULT_SKILLS_DIR = "skills";
export const DEFAULT_REPO = "lgili/skillex";
export const DEFAULT_REF = "main";

/**
 * Resolves the managed workspace state paths used by Skillex.
 *
 * @param cwd - Workspace root.
 * @param baseDir - Managed local state directory.
 * @returns Absolute paths for the state directory and lockfile.
 */
export function getStatePaths(cwd: string, baseDir = DEFAULT_AGENT_SKILLS_DIR): StatePaths {
  const stateDir = path.resolve(cwd, baseDir);
  return {
    scope: "local",
    stateDir,
    lockfilePath: path.join(stateDir, DEFAULT_LOCKFILE),
    skillsDirPath: path.join(stateDir, DEFAULT_LOCAL_SKILLS_DIR),
    generatedDirPath: path.join(stateDir, DEFAULT_GENERATED_DIR),
  };
}

/**
 * Resolves the managed user-level state paths used by Skillex.
 *
 * @param baseDir - Managed global state directory.
 * @returns Absolute paths for the global state directory and lockfile.
 */
export function getGlobalStatePaths(baseDir = getDefaultSkillsDir()): StatePaths {
  const stateDir = path.resolve(baseDir);
  return {
    scope: "global",
    stateDir,
    lockfilePath: path.join(stateDir, DEFAULT_LOCKFILE),
    skillsDirPath: path.join(stateDir, DEFAULT_LOCAL_SKILLS_DIR),
    generatedDirPath: path.join(stateDir, DEFAULT_GENERATED_DIR),
  };
}

/**
 * Resolves the managed state paths for either local or global scope.
 *
 * @param cwd - Workspace root.
 * @param options - Scope and optional base directory override.
 * @returns Absolute paths for the selected state scope.
 */
export function getScopedStatePaths(
  cwd: string,
  options: { scope?: InstallScope | undefined; baseDir?: string | undefined } = {},
): StatePaths {
  if (options.scope === "global") {
    return getGlobalStatePaths(options.baseDir || getDefaultSkillsDir());
  }

  return getStatePaths(cwd, options.baseDir || DEFAULT_AGENT_SKILLS_DIR);
}
