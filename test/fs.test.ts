import test from "node:test";
import assert from "node:assert/strict";

import { assertSafeRelativePath } from "../src/fs.js";

test("assertSafeRelativePath aceita arquivos validos", () => {
  assert.equal(assertSafeRelativePath("tools/run.js"), "tools/run.js");
});

test("assertSafeRelativePath rejeita traversal", () => {
  assert.throws(() => assertSafeRelativePath("../secret.txt"));
});
