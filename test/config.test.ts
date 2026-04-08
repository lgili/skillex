import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { getGlobalStatePaths, getScopedStatePaths, getStatePaths } from "../src/config.js";

test("getStatePaths resolve escopo local", () => {
  const statePaths = getStatePaths("/tmp/demo");
  assert.equal(statePaths.scope, "local");
  assert.equal(statePaths.stateDir, path.resolve("/tmp/demo", ".agent-skills"));
  assert.equal(statePaths.skillsDirPath, path.resolve("/tmp/demo", ".agent-skills", "skills"));
});

test("getGlobalStatePaths resolve escopo global", () => {
  const statePaths = getGlobalStatePaths("/tmp/skillex-global");
  assert.equal(statePaths.scope, "global");
  assert.equal(statePaths.stateDir, path.resolve("/tmp/skillex-global"));
  assert.equal(statePaths.lockfilePath, path.resolve("/tmp/skillex-global", "skills.json"));
});

test("getScopedStatePaths escolhe local ou global", () => {
  const localPaths = getScopedStatePaths("/tmp/demo");
  const globalPaths = getScopedStatePaths("/tmp/demo", {
    scope: "global",
    baseDir: "/tmp/skillex-global",
  });

  assert.equal(localPaths.scope, "local");
  assert.equal(globalPaths.scope, "global");
  assert.equal(globalPaths.stateDir, path.resolve("/tmp/skillex-global"));
});
