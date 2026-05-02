# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `HttpError` typed error with codes `HTTP_TIMEOUT`, `HTTP_RATE_LIMIT`, `HTTP_AUTH_FAILED`, `HTTP_NOT_FOUND`, `HTTP_SERVER_ERROR`, `HTTP_ERROR` so callers can react programmatically to specific failure modes.
- `RemoveSkillsResult.autoSyncs: SyncCommandResult[]` carrying every per-adapter sync outcome after a remove (the existing `autoSync` field is preserved as the first adapter's result for backward compatibility).
- `createSymlink(target, link, { allowedRoot })` overload that refuses to create links pointing outside the managed root, raising `ValidationError("SYMLINK_TARGET_UNSAFE")`.

### Changed
- **Reliability:** all HTTP helpers now abort after a default 30-second timeout when the caller does not provide their own `AbortSignal`, raising `HttpError("HTTP_TIMEOUT")` instead of hanging indefinitely.
- **Performance:** `downloadSkillFiles` now fetches every file in a skill in parallel via `Promise.all`; multi-file skills now scale with bandwidth instead of file count.
- **Security:** `Authorization: Bearer ${GITHUB_TOKEN}` is only attached when the request host is `api.github.com`, `raw.githubusercontent.com`, or any `*.githubusercontent.com` mirror. Tokens are no longer leaked to third-party `--catalog-url` targets.
- **Security:** `~/.askillrc.json` (which may contain `githubToken`) is written with mode `0o600`; existing world-readable files are tightened on next save with a one-time warning.
- **Security:** `removeSkill` validates `metadata.path` against the managed skills store before deleting; tampered lockfile paths raise `INSTALL_PATH_UNSAFE` instead of removing arbitrary directories.
- **Security:** Sync per-skill symlinks now refuse targets that resolve outside the workspace state directory.
- **Security:** `parseDirectGitHubRef` validates the ref segment against `^[A-Za-z0-9_.\-/]+$` and rejects empty refs after `@`; previously dangerous refs would land in the lockfile.
- **HTTP errors:** 403 responses are now split into `HTTP_RATE_LIMIT` (when `X-RateLimit-Remaining: 0`) and `HTTP_AUTH_FAILED`, with separate actionable messages.
- **`maybeSyncAfterRemove`** now runs adapter syncs in parallel via `Promise.all` and returns the full aggregate; the CLI prints one line per adapter after a multi-adapter remove (was previously dropping all but the last adapter's outcome).
- **`toInstallError`** preserves the underlying `error.code` (HTTP error codes, `EACCES`, `ENOENT`, etc.) on the wrapped `InstallError` so callers can distinguish failure modes.
- Refactor: `src/install.ts` split into focused modules — `src/lockfile.ts`, `src/direct-github.ts`, `src/auto-sync.ts`, and `src/downloader.ts`. Public `package.json#exports` and import paths preserved via re-exports. Zero user-visible behavior change.
- Consolidated SKILL.md frontmatter parsing on `parseSkillFrontmatter` (`src/skill.ts`); the duplicate inline parser in `src/catalog.ts` was removed.

### Fixed
- `toLockfileSource` boolean expression no longer contains a duplicated `(label || repo === DEFAULT_REPO)` test (copy-paste artifact); behavior unchanged.
- All remaining Portuguese user-facing strings translated to English: TUI prompt label, sync symlink-fallback warnings, runner errors, direct-install confirmation, confirm prompt for non-TTY terminals, filesystem path errors, and Web UI labels (sidebar, catalog page, skill card buttons, detail page).
- Sync warnings now route through `output.warn` instead of bare `console.error` so they respect color/stream conventions.
- New `scripts/check-language.mjs` regression guard runs as part of `npm test` and fails CI if banned Portuguese tokens reappear in `src/**/*.ts` or `ui/src/**/*.{vue,ts}` without an explicit `i18n-allow:` annotation.
- **CLI parser:** unknown flags now raise `CliError("UNKNOWN_FLAG")` with a Levenshtein-based "did you mean" suggestion instead of being silently accepted. Previously a typo like `--scop=global` ran with default values.
- **CLI parser:** string flags (`--repo`, `--ref`, `--adapter`, `--mode`, ...) now require a value; missing values raise `CliError("MISSING_FLAG_VALUE")` naming the offending flag.
- **CLI parser:** the literal `--` end-of-options sentinel is honored and remaining tokens are exposed via `ParsedArgs.positionalAfter`, so `skillex run x:cmd -- --foo` forwards `--foo` to the underlying script without flag interpretation.
- **CLI:** unknown commands trigger a "did you mean" suggestion based on the same Levenshtein helper; e.g. `skillex insall git-master` now hints `Did you mean: install?`.
- **CLI:** `parseBooleanFlag` errors now name the flag and list the accepted values: `Invalid value "maybe" for --auto-sync. Use true, false, yes, no, on, off, 1, or 0.`
- **CLI:** `INSTALL_NO_TARGETS` (`skillex install` with no args) now prints a 3-line inline usage block instead of a single hint.
- **CLI:** `skillex doctor` differentiates DNS, connection-refused, TLS, and timeout failures and surfaces the underlying error message instead of collapsing every failure into "GitHub API is unreachable".

### Added
- `skillex sync --exit-code` (mirrors `git diff --exit-code`): when combined with `--dry-run`, the command exits `1` whenever drift would be applied. CI scripts can use this to detect "config out of sync" without parsing diff output.
- `suggestClosest(actual, candidates, threshold = 2)` helper in `src/output.ts`, used by the parser and dispatcher to power "did you mean" hints.

## [0.3.1] - 2026-04-08

### Fixed
- Web UI: translate all remaining Portuguese strings to English (`No sources.`, `Sync history`, `Error`/`Done` toasts, `Visible`, `Catalog`, `Skill detail`, `Version`, `Installed`/`Yes`/`No`, `Compatibility`, `Instructions`, `Instructions unavailable`)
- Web UI dark theme: lift background and surface colors from near-black to a more comfortable dark grey; raise `--text-muted` and `--text-dim` contrast for better readability

## [0.3.0] - 2026-04-08

### Added
- `skillex ui` now launches a local HTTP server serving the interactive Vue/Vite SPA instead of a terminal TUI
- New Vue 3 + Vite single-page application under `ui/` with catalog browser, skill detail pages, and router-based navigation
- `src/web-ui.ts`: self-contained HTTP server with `/api/skills` and `/api/catalog` JSON endpoints and graceful shutdown
- `src/markdown.ts`: shared Markdown-to-HTML renderer used by the web API
- Terminal browser detection: `skillex ui` opens the local server in the platform default browser or a detected terminal viewer

### Changed
- `src/cli.ts`: `ui` command now delegates to the local web-UI server
- `src/ui.ts`: updated to detect and delegate to terminal browser when available
- Build: `npm run build` now runs `build:ui` (Vite) followed by `tsc`

## [0.2.5] - 2026-04-08

### Added
- `technical-writing-pro` first-party skill for structured technical writing and documentation

### Changed
- Auto-sync now enabled by default on `skillex init` (was `false`)
- Auto-sync syncs **all detected adapters**, not only the active one — workspaces with multiple agents (e.g. `.claude/` and `.codex/`) are kept in sync automatically
- `sync` and auto-sync output now lists each adapter individually with its target path, sync mode, and whether anything changed
- Removed the restriction that required an active adapter to enable auto-sync

### Fixed
- Skill removal now cleans up the synced adapter target file and its generated source when the last skill is removed
- `remove` correctly iterates all resolved adapters when propagating the removal

## [0.2.4] - 2026-04-08

### Changed
- `skillex ui` skill list now shows compact labels: `Name (id) · tag1, tag2, tag3` — description and full compatibility list removed from each row
- `skillex ui` shows "Fetching catalog..." while loading and limits visible rows to 12 at a time
- `skillex install` and `skillex update` now render an inline progress bar (`[████░░░░] 1/5 skill-id`) instead of printing one line per skill

## [0.2.3] - 2026-04-08

### Fixed
- `skillex list` and all catalog commands no longer fail with `owner/repo` when a lockfile was written by an older version that used the placeholder default source — the placeholder is now silently replaced by `lgili/skillex`

## [0.2.2] - 2026-04-08

### Added
- 9 first-party skills in the default catalog: `commit-craft`, `secure-defaults`, `error-handling`, `test-discipline`, `code-review`, `typescript-pro`, `python-pro`, `cpp-pro`, `latex-pro` — each with full reference files and bundled scripts
- `create-skills` skill upgraded to advanced format: generates SKILL.md with Core Workflow, Reference Guide table, Constraints, and Output Template sections; `--references` flag scaffolds placeholder reference files automatically

### Changed
- `catalog.json` is now a slim index (`formatVersion: 2`): each entry contains only `{ "id" }` — no repeated metadata
- Full skill metadata (name, version, description, tags, compatibility, files) now lives exclusively in each skill's `skill.json`
- CLI catalog loader detects v2 format and fetches each `skill.json` in parallel to hydrate the full manifest

## [0.2.1] - 2026-04-07

### Changed
- Skills and generated symlink sources are now stored in `~/.skillex/` (user-level) instead of `<project>/.agent-skills/`, so a single install is shared across all workspaces and symlinks always resolve correctly
- `claude` adapter: switched from managed-block in `CLAUDE.md` to a dedicated file at `.claude/skills/skillex-skills.md`; old `CLAUDE.md` block cleaned up automatically on next `sync`
- `gemini` adapter: switched from managed-block in `GEMINI.md` to a dedicated file at `.gemini/skills/skillex-skills.md`; old `GEMINI.md` block cleaned up automatically on next `sync`
- `codex` adapter: switched from managed-block in `AGENTS.md` to a dedicated file at `.codex/skills/skillex-skills.md` (introduced in this cycle)
- Symlinks are now absolute paths instead of relative, ensuring they work regardless of project depth
- `copilot` is now the only adapter that uses managed-block injection
- `--agent-skills-dir` flag still overrides to a project-local directory when isolation is needed

## [0.2.0] - 2026-04-07

### Added
- Multi-source catalogs with workspace-managed source lists and a default official source at `lgili/skillex@main`
- `source add`, `source remove`, and `source list` commands for managing configured catalog sources
- Bootstrapped `create-skills` flow for scaffolding full skill-catalog repositories with automatic root catalog registration
- Helper scripts for `create-skills` repository bootstrap and root catalog validation
- Symlink sync mode: skills stored once in `.agent-skills/skills/<id>/` and symlinked to adapter targets with relative paths
- `run` command: execute skill scripts defined in `skill.json` via `scripts.<name>`
- Direct GitHub install: `skillex install owner/repo/path@ref` installs skills without a catalog
- Interactive TUI for `list` and `search` using `@inquirer/prompts`
- Context auto-inject: skills with `autoInject: true` are included automatically on every sync
- Compatibility aliases for all major AI agents: `codex`, `copilot`, `cline`, `cursor`, `claude`, `gemini`, `windsurf`
- `doctor` command with 6 read-only workspace health checks (lockfile, repo, adapter, GitHub reachability, token status, cache freshness)
- `config get <key>` / `config set <key> <value>` commands for persistent global preferences stored in `~/.askillrc.json` (XDG-aware)
- `src/output.ts` module with `success()`, `info()`, `warn()`, `error()`, `debug()` helpers; respects `NO_COLOR` env and `isTTY`
- `--verbose` / `-v` global flag; enables debug-level HTTP logging
- `--json` flag on `list`, `search`, `doctor` commands for machine-readable output
- Command aliases: `ls` → `list`, `rm` / `uninstall` → `remove`
- Per-command `--help` flag
- Catalog disk cache with 5-minute TTL stored at `.agent-skills/.cache/<hash>.json`; bypass with `--no-cache`
- `GITHUB_TOKEN` environment variable support in all HTTP requests to raise API rate limit from 60 to 5,000 req/hr
- Install progress output: `[N/total] Installing <skill-id>...`
- Post-`init` onboarding summary with repo, adapter, and "Next steps" guidance
- `.agent-skills/.gitignore` auto-created on `skillex init` (excludes `.cache/` and `*.log`)
- `onProgress` callback in `installSkills()` for programmatic progress reporting

### Changed
- Full TypeScript migration: all source files converted to `.ts` with `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Module resolution updated to `NodeNext` with explicit `.js` import extensions
- All user-facing strings translated from Portuguese to English
- HTTP error messages rewritten to be actionable (rate limit, 404 with repo hint, 5xx retry suggestion)
- `--verbose` HTTP logging: URL and status code logged via `debug()` on every request

### Fixed
- `AdapterNotFoundError` message was in Portuguese; now reads "Unknown adapter: <id>"

## [0.1.1] - 2026-04-06

### Fixed
- Restored executable bit on `bin/skillex.js`

## [0.1.0] - 2026-04-06

### Added
- Initial release of the Skillex CLI
- `init`, `list`, `search`, `install`, `update`, `remove`, `sync`, `status` commands
- GitHub-hosted skill catalog support via `catalog.json` or repository tree inspection
- Adapter detection and managed-block sync for Copilot, Cline, Cursor, Claude, Gemini, Windsurf, Codex
- Lockfile-based workspace state at `.agent-skills/skills.json`

[Unreleased]: https://github.com/lgili/skillex/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/lgili/skillex/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/lgili/skillex/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/lgili/skillex/releases/tag/v0.1.0
