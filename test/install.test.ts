import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";

import { ensureDir, pathExists, writeJson, writeText } from "../src/fs.js";
import {
  getInstalledSkills,
  initProject,
  installSkills,
  removeSkills,
  updateInstalledSkills,
} from "../src/install.js";
import type { CatalogData } from "../src/types.js";

function createCatalog(version: string): CatalogData {
  return {
    formatVersion: 1,
    repo: "example/skills",
    ref: "main",
    skills: [
      {
        id: "git-master",
        name: "Git Master",
        version,
        description: "Fluxo Git",
        author: "example",
        tags: ["git"],
        compatibility: ["codex"],
        entry: "SKILL.md",
        path: "skills/git-master",
        files: ["SKILL.md", "tools/run.js"],
      },
    ],
  };
}

async function fakeDownloader(
  skill: { id: string; name: string; version: string },
  catalog: { repo: string },
  stateDir: string,
): Promise<void> {
  const skillDir = path.join(stateDir, skill.id);
  await ensureDir(path.join(skillDir, "tools"));
  await writeText(path.join(skillDir, "SKILL.md"), `# ${skill.name} ${skill.version}\n`);
  await writeText(path.join(skillDir, "tools", "run.js"), `export default "${catalog.repo}";\n`);
  await writeJson(path.join(skillDir, "skill.json"), {
    id: skill.id,
    version: skill.version,
  });
}

test("install, update e remove manipulam o lockfile local", async (t: TestContext) => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-install-"));
  t.after(async () => {
    await fs.rm(cwd, { recursive: true, force: true });
  });

  await fs.writeFile(path.join(cwd, "AGENTS.md"), "# workspace\n", "utf8");

  await initProject({
    cwd,
    repo: "example/skills",
    now: () => "2026-04-06T00:00:00.000Z",
  });

  const catalogV1 = createCatalog("1.0.0");
  await installSkills(["git-master"], {
    cwd,
    catalogLoader: async () => catalogV1,
    downloader: fakeDownloader,
    now: () => "2026-04-06T00:10:00.000Z",
  });

  let state = await getInstalledSkills({ cwd });
  assert.ok(state);
  assert.equal(state.adapters.active, "codex");
  assert.equal(state.installed["git-master"]!.version, "1.0.0");
  assert.equal(await pathExists(path.join(cwd, ".agent-skills", "git-master", "SKILL.md")), true);

  const catalogV2 = createCatalog("2.0.0");
  const updateResult = await updateInstalledSkills([], {
    cwd,
    catalogLoader: async () => catalogV2,
    downloader: fakeDownloader,
    now: () => "2026-04-06T00:20:00.000Z",
  });

  assert.equal(updateResult.updatedSkills.length, 1);
  assert.deepEqual(updateResult.missingFromCatalog, []);

  state = await getInstalledSkills({ cwd });
  assert.ok(state);
  assert.equal(state.installed["git-master"]!.version, "2.0.0");

  const removeResult = await removeSkills(["git-master"], {
    cwd,
    now: () => "2026-04-06T00:30:00.000Z",
  });

  assert.deepEqual(removeResult.removedSkills, ["git-master"]);
  assert.deepEqual(removeResult.missingSkills, []);

  state = await getInstalledSkills({ cwd });
  assert.ok(state);
  assert.deepEqual(state.installed, {});
  assert.equal(await pathExists(path.join(cwd, ".agent-skills", "git-master")), false);
});

test("updateInstalledSkills reporta skill ausente no catalogo remoto", async (t: TestContext) => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-update-missing-"));
  t.after(async () => {
    await fs.rm(cwd, { recursive: true, force: true });
  });

  await initProject({
    cwd,
    repo: "example/skills",
    now: () => "2026-04-06T00:00:00.000Z",
  });

  await installSkills(["git-master"], {
    cwd,
    catalogLoader: async () => createCatalog("1.0.0"),
    downloader: fakeDownloader,
    now: () => "2026-04-06T00:10:00.000Z",
  });

  const result = await updateInstalledSkills([], {
    cwd,
    catalogLoader: async () => ({
      formatVersion: 1,
      repo: "example/skills",
      ref: "main",
      skills: [],
    }),
    downloader: fakeDownloader,
    now: () => "2026-04-06T00:20:00.000Z",
  });

  assert.deepEqual(result.updatedSkills, []);
  assert.deepEqual(result.missingFromCatalog, ["git-master"]);
});
