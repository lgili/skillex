import path from "node:path";

export const DEFAULT_AGENT_SKILLS_DIR = ".agent-skills";
export const DEFAULT_LOCKFILE = "skills.json";
export const DEFAULT_CATALOG_PATH = "catalog.json";
export const DEFAULT_SKILLS_DIR = "skills";
export const DEFAULT_REPO = "owner/repo";
export const DEFAULT_REF = "main";

export function getStatePaths(cwd, baseDir = DEFAULT_AGENT_SKILLS_DIR) {
  const stateDir = path.resolve(cwd, baseDir);
  return {
    stateDir,
    lockfilePath: path.join(stateDir, DEFAULT_LOCKFILE),
  };
}
