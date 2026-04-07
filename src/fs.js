import fs from "node:fs/promises";
import path from "node:path";

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath, fallback = null) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function readText(filePath, fallback = null) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeText(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, value, "utf8");
}

export async function removePath(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

export function assertSafeRelativePath(relativePath) {
  if (!relativePath || relativePath.includes("\0")) {
    throw new Error(`Caminho invalido: "${relativePath}"`);
  }

  const normalized = path.posix.normalize(relativePath);
  if (
    normalized.startsWith("../") ||
    normalized === ".." ||
    path.isAbsolute(relativePath) ||
    normalized.startsWith("/")
  ) {
    throw new Error(`Caminho inseguro detectado: "${relativePath}"`);
  }

  return normalized;
}
