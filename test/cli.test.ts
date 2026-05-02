import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs, resolveCommandRoute } from "../src/cli.js";
import { suggestClosest } from "../src/output.js";
import { CliError } from "../src/types.js";

test("resolveCommandRoute abre browse por padrao sem subcomando", () => {
  assert.equal(resolveCommandRoute(undefined), "browse");
});

test("resolveCommandRoute normaliza aliases conhecidos", () => {
  assert.equal(resolveCommandRoute("tui"), "browse");
  assert.equal(resolveCommandRoute("ls"), "list");
  assert.equal(resolveCommandRoute("rm"), "remove");
  assert.equal(resolveCommandRoute("uninstall"), "remove");
});

test("resolveCommandRoute preserva ui para a Web UI", () => {
  assert.equal(resolveCommandRoute("ui"), "ui");
  assert.equal(resolveCommandRoute("browse"), "browse");
});

test("parseArgs accepts known flags and exposes positionals", () => {
  const result = parseArgs(["install", "git-master", "--repo", "lgili/skillex", "--all"]);
  assert.equal(result.command, "install");
  assert.deepEqual(result.positionals, ["git-master"]);
  assert.equal(result.flags.repo, "lgili/skillex");
  assert.equal(result.flags.all, true);
  assert.deepEqual(result.positionalAfter, []);
});

test("parseArgs rejects unknown flags with a Levenshtein suggestion", () => {
  assert.throws(
    () => parseArgs(["install", "--scop=global"]),
    (error: unknown) => {
      assert.ok(error instanceof CliError);
      assert.equal((error as CliError).code, "UNKNOWN_FLAG");
      assert.match((error as CliError).message, /Did you mean --scope/);
      return true;
    },
  );
});

test("parseArgs rejects missing values for string flags", () => {
  assert.throws(
    () => parseArgs(["install", "--repo", "--all"]),
    (error: unknown) => {
      assert.ok(error instanceof CliError);
      assert.equal((error as CliError).code, "MISSING_FLAG_VALUE");
      assert.match((error as CliError).message, /Missing value for --repo/);
      return true;
    },
  );
  // Trailing flag with no value at end of argv.
  assert.throws(
    () => parseArgs(["install", "--repo"]),
    (error: unknown) => {
      assert.ok(error instanceof CliError);
      assert.equal((error as CliError).code, "MISSING_FLAG_VALUE");
      return true;
    },
  );
});

test("parseArgs honors -- end-of-options sentinel", () => {
  const result = parseArgs(["run", "git-master:clean", "--yes", "--", "--foo", "--bar=baz"]);
  assert.equal(result.command, "run");
  assert.deepEqual(result.positionals, ["git-master:clean"]);
  assert.equal(result.flags.yes, true);
  assert.deepEqual(result.positionalAfter, ["--foo", "--bar=baz"]);
});

test("parseArgs accepts --flag=value form", () => {
  const result = parseArgs(["sync", "--mode=copy", "--exit-code"]);
  assert.equal(result.flags.mode, "copy");
  assert.equal(result.flags["exit-code"], true);
});

test("suggestClosest returns the best match within threshold", () => {
  assert.equal(suggestClosest("insall", ["install", "list", "remove", "ui"]), "install");
  assert.equal(suggestClosest("totally-different", ["install", "list", "remove"]), null);
  assert.equal(suggestClosest("", ["install"]), null);
});
