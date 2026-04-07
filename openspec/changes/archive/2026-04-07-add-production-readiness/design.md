## Context
The library is functionally complete and passes all tests, but a first-time user encounters Portuguese-only output, zero guidance after `init`, cryptic network errors, and is missing legal files that corporate environments require. This change is purely a polish/DX layer — no runtime behavior changes, no new commands except `doctor` and `config`, and no new dependencies except where unavoidable.

## Goals / Non-Goals
- Goals:
  - All user-facing strings in English
  - Actionable output at every step (what happened + what to do next)
  - Standard professional CLI features: color, `--verbose`, `--help`, aliases, `--json`
  - Legal/repository hygiene: LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, .npmignore
  - Network error messages with corrective actions
  - Catalog cache to avoid redundant downloads
  - `doctor` command for self-diagnosis
  - Global config file for persistent preferences
- Non-Goals:
  - Full i18n / locale detection (English only — developer tools lingua franca)
  - Interactive TUI (covered by `add-symlink-run-ui-and-direct-install`)
  - Changing lockfile schema or sync behavior
  - Retry logic for network failures (keep scope small; cache reduces impact)

## Decisions

- **i18n: hardcoded English, no library** — locale detection adds complexity with no clear benefit for a developer tool. All strings are written directly in English. No `i18next` or similar library needed.

- **Color: `util.styleText()` (Node ≥ 20), zero dependencies** — Node.js 20 (project minimum) ships `util.styleText()` as a stable API. No `chalk`, no `kleur`. Automatically respects `NO_COLOR` env and non-TTY detection (`process.stdout.isTTY`). A thin `src/output.ts` wrapper exposes `success()`, `warn()`, `error()`, `info()`, `debug()` helpers.

- **`--verbose` propagated via options object** — the existing `ProjectOptions` interface is extended with `verbose?: boolean`. All module functions already accept options objects, so propagation requires no signature changes. When `verbose: true`, `output.debug()` prints `[debug] <message>` in dim color.

- **Per-command help via static `help` property** — each command handler object gains a `help: string` property. The argument parser checks for `--help` before dispatching; if found, it prints `command.help` and exits 0. No separate help file needed.

- **Catalog cache: file-based, TTL in JSON** — cache stored at `.agent-skills/.cache/<sha256-of-source-url>.json` with shape `{ expiresAt: ISO string, data: SkillManifest[] }`. TTL: 5 minutes. `--no-cache` flag forces bypass. Cache invalidated automatically when `expiresAt` < `Date.now()`. No in-memory cache (processes are short-lived).

- **`GITHUB_TOKEN`: env var only, no storage** — reads `process.env.GITHUB_TOKEN` in `src/http.ts` at request time. Never written to disk by the CLI. The global config can store it under `githubToken` as a convenience, but `GITHUB_TOKEN` env var always takes precedence. This mirrors the behaviour of `gh`, `git`, and every major GitHub tool.

- **Global config: `~/.askillrc.json`, JSON format** — simple JSON avoids TOML/YAML parser dependencies. Location follows XDG convention only if `XDG_CONFIG_HOME` is set; otherwise `~/.askillrc.json`. Fields: `defaultRepo`, `defaultAdapter`, `githubToken`, `disableAutoSync`. CLI flags always override. Config loaded once at startup and merged into the options object.

- **`doctor` command: read-only, no side effects** — runs checks in order, prints pass/fail per check, exits 1 if any fail. Checks: lockfile present, repo configured, adapter detected, GitHub reachable (HEAD request to api.github.com), token present (with rate limit tier note), cache freshness.

- **`.npmignore` over `files` allowlist** — the existing `files` field in `package.json` already whitelists `bin/`, `dist/`, `README.md`. Adding `.npmignore` as a belt-and-suspenders complement makes it explicit for contributors and tooling that scans `.npmignore`.

## Alternatives Considered
- **`chalk` for colors** — adds a dependency for something Node 20 provides natively. Rejected.
- **`commander` or `yargs` for per-command help** — adds heavy dependencies for a feature we can implement with 30 lines. Rejected.
- **Redis/SQLite for cache** — wildly over-engineered for CLI catalog caching. File-based JSON with TTL is sufficient. Rejected.
- **Storing `GITHUB_TOKEN` encrypted in lockfile** — security risk; env var is the established pattern. Rejected.

## Risks / Trade-offs
- **`util.styleText()` API stability** — marked stable in Node 20.12+. Since the project requires Node ≥ 20, this is safe; we should document the minimum patch version if needed.
- **Global config file discovery** — `~` expansion must handle Windows (`USERPROFILE`) and Linux/macOS (`HOME`). Use `os.homedir()` which handles both.
- **Cache invalidation** — a stale cache could show outdated skills. Mitigation: 5-minute TTL is short enough for practical use; `--no-cache` is always available.

## Migration Plan
1. Create `src/output.ts` with color/print helpers.
2. Translate all strings; replace `console.log/error` with `output.*` calls.
3. Add `--verbose`, `--help`, `--json`, aliases to argument parser.
4. Add `GITHUB_TOKEN` support and improved error messages to `src/http.ts`.
5. Add catalog cache to `src/catalog.ts`.
6. Add `--repo` upfront validation and post-init guidance to `init` handler.
7. Add `.gitignore` creation to `initProject()`.
8. Create `src/user-config.ts`; wire `config` command; merge into options at startup.
9. Add `doctor` command.
10. Add repository files: LICENSE, CHANGELOG.md, CONTRIBUTING.md, SECURITY.md, .npmignore.
