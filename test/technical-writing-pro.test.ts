import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";

const WORKSPACE_ROOT = process.cwd();
const OUTLINE_SCRIPT = path.join(
  WORKSPACE_ROOT,
  "skills",
  "technical-writing-pro",
  "scripts",
  "scaffold_report_outline.py",
);

test("technical-writing-pro scaffold generates a concise report outline", async (t: TestContext) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-tech-writing-"));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const outputPath = path.join(root, "validation-outline.md");
  const result = spawnSync(
    "python3",
    [
      OUTLINE_SCRIPT,
      "--title",
      "Converter Validation Summary",
      "--report-type",
      "validation-report",
      "--author",
      "Automation",
      "--project",
      "Power Stage",
      "--output",
      outputPath,
    ],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const outline = await fs.readFile(outputPath, "utf8");
  assert.match(outline, /^# Converter Validation Summary/m);
  assert.match(outline, /Report type: validation-report/);
  assert.match(outline, /Writing target: concise technical-scientific style/);
  assert.match(outline, /Table 1: requirement matrix/);
  assert.match(outline, /Direct validation outcome/);
});
