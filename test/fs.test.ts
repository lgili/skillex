import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { assertSafeRelativePath, createSymlink, isPathInside } from "../src/fs.js";
import { ValidationError } from "../src/types.js";

test("assertSafeRelativePath aceita arquivos validos", () => {
  assert.equal(assertSafeRelativePath("tools/run.js"), "tools/run.js");
});

test("assertSafeRelativePath rejeita traversal", () => {
  assert.throws(() => assertSafeRelativePath("../secret.txt"));
});

test("isPathInside detects containment correctly", () => {
  assert.equal(isPathInside("/foo/bar/baz", "/foo/bar"), true);
  assert.equal(isPathInside("/foo/bar", "/foo/bar"), true);
  assert.equal(isPathInside("/foo/bar/../etc", "/foo/bar"), false);
  assert.equal(isPathInside("/etc/passwd", "/foo/bar"), false);
  assert.equal(isPathInside("/foo/barbaz", "/foo/bar"), false); // sibling, not child
});

test("createSymlink refuses targets outside allowedRoot", async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-fs-allowed-root-"));
  t.after(() => fs.rm(tmp, { recursive: true, force: true }));
  const root = path.join(tmp, "store");
  const outside = path.join(tmp, "outside.txt");
  const link = path.join(root, "danger.lnk");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(outside, "x");

  await assert.rejects(
    createSymlink(outside, link, { allowedRoot: root }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal((error as ValidationError).code, "SYMLINK_TARGET_UNSAFE");
      return true;
    },
  );

  // No file should have been created.
  await assert.rejects(fs.lstat(link));
});

test("createSymlink accepts targets inside allowedRoot", async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-fs-allowed-root-"));
  t.after(() => fs.rm(tmp, { recursive: true, force: true }));
  const root = path.join(tmp, "store");
  const target = path.join(root, "real.txt");
  const link = path.join(root, "link.txt");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(target, "hello");

  const result = await createSymlink(target, link, { allowedRoot: root });
  assert.equal(result.ok || result.fallback, true); // either symlink or fallback acceptable on the host
});
