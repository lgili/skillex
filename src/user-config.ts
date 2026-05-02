/**
 * Global user configuration for the Skillex CLI.
 *
 * Reads and writes `~/.askillrc.json`. CLI flags and environment variables
 * always take precedence over values stored here.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Shape of the global user configuration file (`~/.askillrc.json`).
 */
export interface UserConfig {
  /** Default catalog repository in `owner/repo` format. */
  defaultRepo?: string | undefined;
  /** Default adapter ID to use when none is detected. */
  defaultAdapter?: string | undefined;
  /** GitHub personal access token (fallback when GITHUB_TOKEN env is unset). */
  githubToken?: string | undefined;
  /** When `true`, auto-sync is disabled globally. */
  disableAutoSync?: boolean | undefined;
}

/** Valid keys that may be set via `skillex config set`. */
export const VALID_CONFIG_KEYS: ReadonlyArray<keyof UserConfig> = [
  "defaultRepo",
  "defaultAdapter",
  "githubToken",
  "disableAutoSync",
];

/**
 * Resolves the path to the global config file.
 *
 * Respects `XDG_CONFIG_HOME` when set; otherwise uses `~/.askillrc.json`.
 */
export function getUserConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    return path.join(xdg, "skillex", "config.json");
  }
  return path.join(os.homedir(), ".askillrc.json");
}

/**
 * Reads the global user configuration file.
 *
 * Returns an empty object when the file does not exist or is invalid JSON.
 */
export async function readUserConfig(): Promise<UserConfig> {
  try {
    const content = await fs.readFile(getUserConfigPath(), "utf-8");
    return JSON.parse(content) as UserConfig;
  } catch {
    return {};
  }
}

/**
 * Writes the global user configuration file, merging with any existing values.
 *
 * The file is always written with mode `0o600` so any stored `githubToken` is
 * not world-readable. If a previous version of the file existed with looser
 * permissions, the mode is tightened on save and a one-time warning is
 * printed during the session.
 *
 * @param updates - Key/value pairs to write.
 */
export async function writeUserConfig(updates: Partial<UserConfig>): Promise<void> {
  const configPath = getUserConfigPath();
  const existing = await readUserConfig();
  const merged = { ...existing, ...updates };
  await fs.mkdir(path.dirname(configPath), { recursive: true });

  let previousMode: number | null = null;
  try {
    const stat = await fs.stat(configPath);
    previousMode = stat.mode & 0o777;
  } catch {
    previousMode = null;
  }

  await fs.writeFile(configPath, JSON.stringify(merged, null, 2) + "\n", { encoding: "utf-8", mode: 0o600 });
  // `fs.writeFile` with `mode` only applies on file creation; chmod afterwards to
  // tighten an existing file's permissions.
  await fs.chmod(configPath, 0o600);

  if (previousMode !== null && previousMode !== 0o600 && !looseConfigWarned) {
    looseConfigWarned = true;
    console.warn(
      `[skillex] Tightened permissions on ${configPath} from ${previousMode.toString(8)} to 600.`,
    );
  }
}

let looseConfigWarned = false;
