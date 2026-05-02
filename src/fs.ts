import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { CreateSymlinkResult } from "./types.js";
import { ValidationError } from "./types.js";

/** Optional safety constraints for `createSymlink`. */
export interface CreateSymlinkOptions {
  /**
   * When provided, the resolved symlink target MUST be inside this directory.
   * Anything outside (including paths that escape via `..`) is rejected with
   * a `ValidationError`. Use this to confine adapter symlinks to the
   * managed skills store.
   */
  allowedRoot?: string | undefined;
}

/**
 * Checks whether a file or directory exists.
 *
 * @param targetPath - Absolute or relative path to probe.
 * @returns `true` when the target exists.
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures that a directory exists.
 *
 * @param dirPath - Directory path to create.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Reads and parses a JSON file, returning a fallback when the file is missing.
 *
 * @param filePath - JSON file path.
 * @param fallback - Value returned for missing files.
 * @returns Parsed JSON content or the fallback value.
 */
export async function readJson<T>(filePath: string, fallback: T | null = null): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

/**
 * Reads a UTF-8 text file, returning a fallback when the file is missing.
 *
 * @param filePath - Text file path.
 * @param fallback - Value returned for missing files.
 * @returns File content or the fallback value.
 */
export async function readText(filePath: string, fallback: string | null = null): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

/**
 * Writes a JSON value to disk with stable pretty-print formatting.
 *
 * @param filePath - Output file path.
 * @param value - Serializable JSON value.
 */
export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Writes UTF-8 text content to disk.
 *
 * @param filePath - Output file path.
 * @param value - Text content to write.
 */
export async function writeText(filePath: string, value: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, value, "utf8");
}

/**
 * Removes a file or directory recursively when present.
 *
 * @param targetPath - File system path to remove.
 */
export async function removePath(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
}

/**
 * Copies a file or directory recursively to a destination path.
 *
 * @param sourcePath - Existing source path.
 * @param targetPath - Destination path.
 */
export async function copyPath(sourcePath: string, targetPath: string): Promise<void> {
  await ensureDir(path.dirname(targetPath));
  await removePath(targetPath);
  await fs.cp(sourcePath, targetPath, { recursive: true, force: true });
}

/**
 * Creates a relative symlink and reports whether the caller should fall back to copy mode.
 *
 * When `options.allowedRoot` is set, the resolved target MUST be inside it; targets
 * outside the root raise `ValidationError("SYMLINK_TARGET_UNSAFE")` and no link is
 * written. This prevents a tampered lockfile from pointing adapter symlinks at
 * arbitrary filesystem locations.
 *
 * @param targetPath - Absolute path the link should point to.
 * @param linkPath - Absolute path of the symlink to create.
 * @param options - Optional safety constraints.
 * @returns Symlink creation result.
 */
export async function createSymlink(
  targetPath: string,
  linkPath: string,
  options: CreateSymlinkOptions = {},
): Promise<CreateSymlinkResult> {
  const absoluteTarget = path.resolve(targetPath);

  if (options.allowedRoot) {
    const allowedRoot = path.resolve(options.allowedRoot);
    if (!isPathInside(absoluteTarget, allowedRoot)) {
      throw new ValidationError(
        `Refusing to symlink outside the managed root: target=${absoluteTarget} root=${allowedRoot}`,
        "SYMLINK_TARGET_UNSAFE",
      );
    }
  }

  const relativeTarget = path.relative(path.dirname(linkPath), absoluteTarget) || ".";
  await ensureDir(path.dirname(linkPath));
  await removePath(linkPath);

  try {
    const stats = await fs.lstat(absoluteTarget);
    await fs.symlink(relativeTarget, linkPath, stats.isDirectory() ? "dir" : "file");
    return {
      ok: true,
      fallback: false,
      relativeTarget,
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "EPERM" || error.code === "ENOTSUP")
    ) {
      return {
        ok: false,
        fallback: true,
        relativeTarget,
      };
    }
    throw error;
  }
}

/**
 * Returns `true` when `candidate` resolves to a path inside `root` (or equals `root`).
 */
export function isPathInside(candidate: string, root: string): boolean {
  const candidateAbs = path.resolve(candidate);
  const rootAbs = path.resolve(root);
  if (candidateAbs === rootAbs) {
    return true;
  }
  const rel = path.relative(rootAbs, candidateAbs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return false;
  }
  return true;
}

/**
 * Removes a symlink without following it.
 *
 * @param linkPath - Link path to remove when present.
 */
export async function removeSymlink(linkPath: string): Promise<void> {
  try {
    const stats = await fs.lstat(linkPath);
    if (stats.isSymbolicLink()) {
      await fs.unlink(linkPath);
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

/**
 * Reads a symlink target when the path is a symbolic link.
 *
 * @param linkPath - Candidate link path.
 * @returns Link target or `null` when the path is missing or not a symlink.
 */
export async function readSymlink(linkPath: string): Promise<string | null> {
  try {
    const stats = await fs.lstat(linkPath);
    if (!stats.isSymbolicLink()) {
      return null;
    }
    return await fs.readlink(linkPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Validates and normalizes a safe relative path.
 *
 * @param relativePath - Candidate relative path.
 * @returns Normalized POSIX relative path.
 * @throws {ValidationError} When the path is empty, absolute, or escapes the root.
 */
export function assertSafeRelativePath(relativePath: string): string {
  if (!relativePath || relativePath.includes("\0")) {
    throw new ValidationError(`Caminho invalido: "${relativePath}"`);
  }

  const normalized = path.posix.normalize(relativePath);
  if (
    normalized.startsWith("../") ||
    normalized === ".." ||
    path.isAbsolute(relativePath) ||
    normalized.startsWith("/")
  ) {
    throw new ValidationError(`Caminho inseguro detectado: "${relativePath}"`);
  }

  return normalized;
}
