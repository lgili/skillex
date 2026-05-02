import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { writeUserConfig, getUserConfigPath } from "../src/user-config.js";

test("writeUserConfig persists ~/.askillrc.json with mode 0600", async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-user-config-"));
  const xdgPrev = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmp;
  t.after(async () => {
    if (xdgPrev === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = xdgPrev;
    }
    await fs.rm(tmp, { recursive: true, force: true });
  });

  await writeUserConfig({ githubToken: "secret" });
  const configPath = getUserConfigPath();
  const stat = await fs.stat(configPath);
  // Compare only the permission bits.
  assert.equal(stat.mode & 0o777, 0o600);
});

test("writeUserConfig tightens an existing world-readable file", async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skillex-user-config-"));
  const xdgPrev = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmp;
  t.after(async () => {
    if (xdgPrev === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = xdgPrev;
    }
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const configPath = getUserConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, "{}", { mode: 0o644 });
  await fs.chmod(configPath, 0o644);

  await writeUserConfig({ defaultRepo: "lgili/skillex" });

  const stat = await fs.stat(configPath);
  assert.equal(stat.mode & 0o777, 0o600);
});
