# Project Context

## Purpose

Skillex is a CLI plus local Web UI that installs and synchronizes AI agent
skills from GitHub-hosted catalogs across multiple agent adapters
(Claude, Codex, Cursor, Copilot, Cline, Gemini, Windsurf). It treats
skills like packages: discoverable via a catalog, installable into a
managed store, and synchronized into each agent's expected location.

## Tech Stack

- TypeScript 5.x with strict mode (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), ESM (`NodeNext`), `node>=20`
- Runtime deps: only `@inquirer/prompts`
- Web UI: Vue 3 + Vite 6 + vue-router 4
- Tests: `node --test` against compiled `.test-dist/` output

## Project Conventions

### Code Style

- All user-facing strings are English (Portuguese is in flight to be
  removed; see `standardize-cli-language-to-english` change).
- All user output goes through `src/output.ts` helpers
  (`info`, `success`, `warn`, `error`, `debug`); direct `console.*`
  calls for end-user output are discouraged.
- File-naming: kebab-case modules under `src/`. Avoid catch-all files.

### Architecture Patterns

The CLI surface lives in `src/cli.ts`. Domain logic is split by concern:

| Module | Responsibility |
|---|---|
| `src/install.ts` | Install / update / remove / sync orchestration. Re-exports the moved helpers below for backward compatibility. |
| `src/lockfile.ts` | Lockfile shape, normalization, source-list dedupe, migration. |
| `src/direct-github.ts` | Direct-GitHub install path: parsing, fetch, download, trust prompt. |
| `src/auto-sync.ts` | Auto-sync orchestration after install / update / remove (sync function injected to avoid import cycles). |
| `src/downloader.ts` | Shared per-file download loop used by both catalog and direct paths. |
| `src/catalog.ts` | Catalog loading from `catalog.json`, GitHub tree fallback, search, cache. Calls `parseSkillFrontmatter` from `src/skill.ts`. |
| `src/sync.ts` | Adapter-target sync (managed-block, dedicated-file, directory-native), diff generation. |
| `src/adapters.ts` | Adapter detection, marker priorities, alias normalization. |
| `src/skill.ts` | Canonical SKILL.md frontmatter parser. **Single source of truth.** |
| `src/http.ts` | `fetch` wrappers with debug logging and (planned) timeouts and host-restricted Authorization. |
| `src/fs.ts` | `ensureDir`, `readJson`, `writeJson`, `removePath`, symlink helpers, `assertSafeRelativePath`. |
| `src/output.ts` | Stream-aware coloring, debug, progress bar, table printer. |
| `src/runner.ts` | `skillex run skill:script` execution. |
| `src/ui.ts` | Interactive terminal browser. |
| `src/web-ui.ts` | Local HTTP server + token gate that serves `dist-ui/` and JSON APIs. |
| `bin/skillex.js` | Argv shim that calls `src/cli.ts` and translates errors to exit codes. |

### Testing Strategy

- Tests live in `test/` and import from `../src/*.js` (compiled-output-relative).
- Prefer dependency injection over mocking globals (every install /
  sync function accepts `now`, `confirm`, `linkFactory`,
  `catalogLoader`, `downloader` overrides).
- Network is never hit from tests; HTTP behavior is exercised through
  injected loaders / downloaders.
- Filesystem isolation is via `mkdtemp` + `t.after` cleanup.

### Git Workflow

- Conventional commits encouraged (`feat:`, `fix:`, `refactor:`, etc.).
- One OpenSpec change per logical chunk; archived with
  `openspec archive <id> --yes` after the change is merged.

## Domain Context

- **Skill**: a directory containing `skill.json` (or `SKILL.md` with
  frontmatter) and the files it ships. Identified by `id` (kebab-case).
- **Catalog**: a GitHub repo that exposes either `catalog.json` (slim
  index in v2, full manifest in v1) or a tree of
  `skills/*/skill.json`.
- **Source**: a configured catalog (repo + ref + optional label).
- **Adapter**: an integration with one AI agent (Claude, Codex, etc.).
  Adapters split into `managed-directory` (one folder per skill in
  `.claude/skills/`, etc.), `dedicated-file` (one `.md` file per
  workspace), and `managed-block` (Copilot — a managed block inside an
  existing file).
- **Lockfile**: `.agent-skills/skills.json` (workspace) or
  `~/.skillex/skills.json` (global). Records sources, adapters,
  installed skills, and sync history.

## Important Constraints

- The package ships `dist/` and `dist-ui/`; users must not run a build
  step at install time.
- `package.json#exports` is the public API. Refactors must preserve
  every existing entry shape; new modules are accessed via re-exports
  from existing entries.
- Loopback-only Web UI server with per-session token; no public ports.
- Token storage (`~/.askillrc.json`) should be mode `0o600` (planned).

## External Dependencies

- GitHub raw content API (`raw.githubusercontent.com`).
- GitHub REST API (`api.github.com`) for tree fallback and rate-limit
  headers.
- Optional `GITHUB_TOKEN` env var — raises rate limit from 60 to 5,000
  req/hr; only ever sent to GitHub hosts (planned host check).
