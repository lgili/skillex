import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRawGitHubUrl,
  parseGitHubRepo,
  resolveSource,
  searchCatalogSkills,
} from "../src/catalog.js";
import { parseSkillFrontmatter } from "../src/skill.js";
import type { SkillManifest } from "../src/types.js";

test("parseGitHubRepo aceita owner/repo", () => {
  assert.deepEqual(parseGitHubRepo("openai/skills"), {
    owner: "openai",
    repo: "skills",
    ref: null,
  });
});

test("parseGitHubRepo aceita URL com tree/ref", () => {
  assert.deepEqual(
    parseGitHubRepo("https://github.com/openai/skills/tree/main"),
    {
      owner: "openai",
      repo: "skills",
      ref: "main",
    },
  );
});

test("buildRawGitHubUrl preserva refs simples", () => {
  assert.equal(
    buildRawGitHubUrl("openai/skills", "main", "skills/git-master/SKILL.md"),
    "https://raw.githubusercontent.com/openai/skills/main/skills/git-master/SKILL.md",
  );
});

test("resolveSource usa defaults previsiveis", () => {
  const source = resolveSource({ repo: "openai/skills" });
  assert.equal(source.repo, "openai/skills");
  assert.equal(source.ref, "main");
  assert.equal(source.catalogPath, "catalog.json");
  assert.equal(source.skillsDir, "skills");
});

test("searchCatalogSkills filtra por texto e compatibilidade", () => {
  const skills: SkillManifest[] = [
    {
      id: "git-master",
      name: "Git Master",
      version: "1.0.0",
      description: "Fluxo semantico para git",
      author: null,
      tags: ["git", "workflow"],
      compatibility: ["codex", "copilot"],
      entry: "SKILL.md",
      path: "skills/git-master",
      files: ["SKILL.md"],
    },
    {
      id: "pdf-toolkit",
      name: "PDF Toolkit",
      version: "1.0.0",
      description: "Manipula pdfs",
      author: null,
      tags: ["pdf"],
      compatibility: ["cline"],
      entry: "SKILL.md",
      path: "skills/pdf-toolkit",
      files: ["SKILL.md"],
    },
  ];

  const results = searchCatalogSkills(skills, {
    query: "git",
    compatibility: "codex",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]!.id, "git-master");
});

test("parseSkillFrontmatter extracts the optional category field", () => {
  assert.deepEqual(
    parseSkillFrontmatter(`---\nname: x\ndescription: y\ncategory: code\n---\n`),
    { name: "x", description: "y", category: "code" },
  );
  assert.deepEqual(
    parseSkillFrontmatter(`---\nname: x\ncategory: "infra"\n---\n`),
    { name: "x", category: "infra" },
  );
  // Missing category leaves the field undefined.
  const without = parseSkillFrontmatter(`---\nname: x\n---\n`);
  assert.equal(without.category, undefined);
});

test("parseSkillFrontmatter handles plain, quoted, and colon-bearing values", () => {
  // Plain value.
  assert.deepEqual(
    parseSkillFrontmatter(`---\nname: git-master\ndescription: Semantic git flow\n---\n# Body`),
    { name: "git-master", description: "Semantic git flow" },
  );

  // Quoted value (single and double).
  assert.deepEqual(
    parseSkillFrontmatter(`---\nname: "git-master"\ndescription: 'Semantic git flow'\n---\n`),
    { name: "git-master", description: "Semantic git flow" },
  );

  // Value with `:` characters preserved.
  assert.deepEqual(
    parseSkillFrontmatter(`---\nname: net-tools\ndescription: Helpers for tcp:443 and tls:1.3\n---\n`),
    { name: "net-tools", description: "Helpers for tcp:443 and tls:1.3" },
  );

  // Boolean coercion for autoInject.
  assert.deepEqual(
    parseSkillFrontmatter(`---\nname: x\nautoInject: true\nactivationPrompt: "Run me"\n---\n`),
    { name: "x", autoInject: true, activationPrompt: "Run me" },
  );

  // Missing frontmatter returns empty object.
  assert.deepEqual(parseSkillFrontmatter("# No frontmatter here"), {});
});

test("searchCatalogSkills normaliza aliases de compatibilidade", () => {
  const skills: SkillManifest[] = [
    {
      id: "reviewer",
      name: "Reviewer",
      version: "1.0.0",
      description: "Review de codigo",
      author: null,
      tags: ["review"],
      compatibility: ["claude"],
      entry: "SKILL.md",
      path: "skills/reviewer",
      files: ["SKILL.md"],
    },
    {
      id: "issue-helper",
      name: "Issue Helper",
      version: "1.0.0",
      description: "Ajuda com issues",
      author: null,
      tags: ["issues"],
      compatibility: ["gemini-cli"],
      entry: "SKILL.md",
      path: "skills/issue-helper",
      files: ["SKILL.md"],
    },
  ];

  const claudeResults = searchCatalogSkills(skills, {
    compatibility: "claude-code",
  });
  assert.equal(claudeResults.length, 1);
  assert.equal(claudeResults[0]!.id, "reviewer");

  const geminiResults = searchCatalogSkills(skills, {
    compatibility: "gemini",
  });
  assert.equal(geminiResults.length, 1);
  assert.equal(geminiResults[0]!.id, "issue-helper");
});
