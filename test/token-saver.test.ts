import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";

const WORKSPACE_ROOT = process.cwd();
const TOKEN_REPORT_SCRIPT = path.join(
  WORKSPACE_ROOT,
  "skills",
  "token-saver",
  "scripts",
  "token_report.js",
);
const SCAFFOLD_SCRIPT = path.join(
  WORKSPACE_ROOT,
  "skills",
  "token-saver",
  "scripts",
  "scaffold_compact_memory.js",
);

test("token-saver token report ranks heavy memory files", async (t: TestContext) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-token-saver-"));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  await fs.mkdir(path.join(root, ".cursor", "rules"), { recursive: true });
  await fs.writeFile(
    path.join(root, "CLAUDE.md"),
    `# Project Memory

This project contains a very long narrative paragraph that explains far more context than the
agent needs every session. It repeats the same ideas, adds onboarding prose, and keeps a lot of
detail that belongs in separate documentation. The point of this paragraph is simply to create a
heavy always-on file so the token report can detect it as a good compression target.

This second paragraph repeats the same pattern with more redundant context, more narration, and
more words than an always-on memory file should ever keep. It exists only to make the file large
enough that the audit flags it as worth compressing or splitting into on-demand references.

This third paragraph does the same thing again, intentionally inflating the file with durable-sounding
text that is not actually durable. The report should rank this file first and label it as a high
savings candidate instead of something that is already lean.
`,
    "utf8",
  );
  await fs.writeFile(
    path.join(root, ".cursor", "rules", "style.mdc"),
    "# Cursor rules\n\n- Keep output concise.\n",
    "utf8",
  );

  const result = spawnSync(
    "node",
    [TOKEN_REPORT_SCRIPT, "--root", root, "--json"],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.files[0].file, "CLAUDE.md");
  assert.equal(payload.files[0].kind, "memory");
  assert.ok(payload.files[0].tokenEstimate > 20);
  assert.match(payload.files[0].recommendation, /candidate/i);
});

test("token-saver scaffold generates a compact codex memory file", async (t: TestContext) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-token-saver-scaffold-"));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const result = spawnSync(
    "node",
    [
      SCAFFOLD_SCRIPT,
      "--agent",
      "codex",
      "--root",
      root,
      "--project",
      "Power Stage",
      "--mission",
      "Ship safe converter tooling.",
      "--stack",
      "TypeScript;Node.js",
      "--constraints",
      "No secrets in repo;Run tests before closing work",
      "--workflow",
      "Read the task;Change the code;Validate the result",
    ],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const outputPath = path.join(root, "AGENTS.md");
  const scaffold = await fs.readFile(outputPath, "utf8");
  assert.match(scaffold, /^# Power Stage Memory/m);
  assert.match(scaffold, /> Agent target: codex/m);
  assert.match(scaffold, /## Constraints/m);
  assert.match(scaffold, /- No secrets in repo/m);
  assert.match(scaffold, /- Read the task/m);
});
