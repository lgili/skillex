# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-05-02

A substantial release focused on **reliability, security, and UX**. The CLI is
now production-grade (HTTP timeouts, host-restricted token, parallel
downloads, hardened parser); the Web UI grew bulk actions, keyboard
shortcuts, multi-select, persistent state, an accessible doctor panel, and a
mobile drawer; and the codebase was refactored for maintainability without
breaking the public API.

Test count went from 63 → 88 (no regressions).

### Highlights

- **Reliability & security pass** — HTTP timeouts everywhere, GitHub token
  scoped to GitHub-owned hosts, lockfile path safety, symlink confinement,
  ref-character validation, mode `0o600` on `~/.askillrc.json`, parallel
  file downloads (5–10× speedup on multi-file skills).
- **CLI parser hardened** — unknown flags rejected with "did you mean"
  suggestions, `--` sentinel honored, missing-value detection, unknown
  commands suggest the closest match, `parseBooleanFlag` names the flag and
  lists accepted values, `skillex doctor` differentiates DNS / TLS /
  refused / timeout failures.
- **Three new top-level commands / flags** — `skillex show <id>` previews a
  skill's SKILL.md without installing, `skillex init --install-recommended`
  ships a curated starter pack, `skillex sync --dry-run --exit-code`
  mirrors `git diff --exit-code` for CI drift detection.
- **Web UI marketplace overhaul** — Install all + Install recommended +
  Remove all bulk actions; per-card optimistic UI; Shift+click multi-select
  with range select; sticky selection bar; persistent selection across
  refreshes; search highlight; group-by-source; related skills; mobile
  drawer; Doctor panel + sidebar health dot; breadcrumbs; first-load
  skeletons; `⌘K` and `⇧⌘A` shortcuts.
- **Internationalization & regression guard** — every user-facing string
  is now English; `scripts/check-language.mjs` runs in `npm test` and fails
  CI if banned Portuguese tokens reappear without an explicit
  `i18n-allow:` annotation.
- **Refactor** — `src/install.ts` (1326 LOC) split into focused modules
  (`lockfile.ts`, `direct-github.ts`, `auto-sync.ts`, `downloader.ts`,
  `doctor.ts`) with re-exports preserving every existing import path.

### Added — Core / CLI

- `skillex show <skill-id>` — preview a skill's manifest + rendered SKILL.md
  from the configured sources without installing. `--raw` prints the
  markdown verbatim; `--json` returns the manifest plus the entry content
  as a single object.
- `skillex init --install-recommended` — after writing the lockfile, install
  a curated 5-skill starter pack (`commit-craft`, `code-review`,
  `secure-defaults`, `error-handling`, `test-discipline`) using the same
  progress bar as `install --all`. The recommended list lives in
  `src/recommended.ts` (single source of truth).
- `skillex sync --dry-run --exit-code` — exit `1` whenever the dry-run
  would change at least one adapter (mirrors `git diff --exit-code`). CI
  scripts can detect drift without parsing the diff output.
- `--tags <tag>` is accepted as a hidden alias of `--tag` on
  `skillex search` so previously documented examples keep working.
- `src/doctor.ts` exports `runDoctorChecks(options): Promise<DoctorReport>`
  — the canonical six health checks reused by both the CLI and the Web UI.
- `HttpError` typed error class with codes `HTTP_TIMEOUT`,
  `HTTP_RATE_LIMIT`, `HTTP_AUTH_FAILED`, `HTTP_NOT_FOUND`,
  `HTTP_SERVER_ERROR`, and `HTTP_ERROR`.
- `RemoveSkillsResult.autoSyncs: SyncCommandResult[]` — full per-adapter
  sync aggregate (the existing `autoSync` field is preserved as the first
  result for backward compat).
- `createSymlink(target, link, { allowedRoot })` overload that refuses
  targets resolving outside the managed root.
- `SkillManifest.category?: string` (optional). Catalog publishers can
  group skills explicitly instead of relying on consumer-side regex
  inference. Read from both `skill.json` and SKILL.md frontmatter.
- `suggestClosest(actual, candidates, threshold = 2)` helper in
  `src/output.ts` powers "did you mean" hints across the parser and
  dispatcher.

### Added — Web UI

- **Doctor panel** + `GET /api/doctor` endpoint mirroring the CLI's six
  checks, with a sidebar status dot (green / yellow / red + pulse)
  refreshed after every mutation.
- **Bulk install / remove / install-recommended** buttons in the catalog
  hero, each guarded by an accessible `ConfirmDialog` (role=dialog,
  aria-modal, focus on Cancel, Esc cancels, Enter only fires when no
  button has focus).
- **Per-card optimistic UI** — single-skill install / remove / update show
  a localized spinner inside the card and dim only that card. Backed by
  `state.busyCards: Set<string>` and a `runCardAction(skillId, label, fn)`
  store helper. Bulk actions still use the global overlay.
- **Bulk select via Shift+click** — sticky selection bar shows
  `N selected`, `Select all visible (M)` link, and `Install N` /
  `Remove N` buttons that count only the eligible subset. Plain click in
  selection mode toggles. Esc clears (priority cascade — see Changed).
- **Range select** — Shift+click on a second card selects the range
  between the anchor and the target in the visible-id ordering
  (Finder/Excel behavior). The anchor moves with each interaction so
  successive Shift+clicks extend from the latest endpoint.
- **Persistent selection** — selection (ids + anchor + scope) is mirrored
  to `localStorage["skillex.selection"]`. Restored on startup, filtered to
  ids that still exist in the loaded catalog under the same scope.
- **Search highlight** — query matches in skill name and description are
  wrapped in `<mark class="search-mark">` with an accent background. Pure
  template rendering (no `v-html`) — XSS-safe.
- **Group-by-source toggle** — when more than one source is configured, a
  toggle in the category-pill row buckets the grid by source.repo with
  per-bucket headers and counts.
- **Related skills** on the SkillDetailPage — up to 4 cards scored by tag
  overlap (+ 0.5 bonus for matching `category`). Cards are keyboard
  accessible, show a 2-line description clamp, up to 3 tags, and a ✓ when
  the related skill is already installed.
- **Breadcrumbs** on the SkillDetailPage —
  `Catalog (link, home icon) / category / skill-name (current)`.
  Category resolves from the explicit manifest field first, falls back to
  the regex inference, hidden when no signal.
- **Onboarding card** for fresh workspaces — replaces the generic empty
  state with a bright Install-all CTA + count when the workspace has zero
  installed skills and no filter is active.
- **Installed-only filter** — the "Installed" overview card is now a
  toggle (`role=button`, Enter/Space, `aria-pressed`); active state filters
  the grid to installed skills only. The stat now reads `N / total`.
- **Inferred category chip** on cards whose category came from regex
  fallback rather than an explicit manifest field.
- **First-load skeletons** — new `Skeleton.vue` (variants `card` / `row`).
  Catalog page renders 6 card-skeletons until `state.catalog` resolves;
  Doctor page renders 4 row-skeletons; SkillDetailPage renders metadata
  + body + related skeletons during its first fetch.
- **Mobile drawer** — sidebar slides in/out on viewports ≤680 px instead
  of being hidden entirely. Triggered by a topbar hamburger; tap backdrop
  or Esc to close; route changes auto-close.
- **Adapter dropdown** for compact viewports (≤1100 px) — replaces the 7
  icon row with a single trigger + listbox menu (`role=listbox`,
  `role=option`, `aria-selected`).
- **`⌘K` / `Ctrl+K` shortcut** — focuses the topbar search. Navigates back
  to `/` first when invoked from another route. Adaptive hint badge.
- **`⇧⌘A` / `Ctrl+Shift+A` shortcut** — opens the Install-all confirm on
  the catalog page. Skipped when typing in inputs. Shift required so the
  browser's native "select all" (Cmd+A) is preserved. Discoverable via the
  shortcut chip on the Install-all button.
- **Demo media placeholder** — new `docs/media/` with a README describing
  how to regenerate `tui.gif`, `web-ui.png`, `web-ui-doctor.png` (vhs +
  asciinema). Main README has a "Demo" section that references the media
  via raw GitHub URLs (no binaries in the npm tarball).
- **"Why Skillex" section** in the README plus a Quick Start that leads
  with `npx skillex@latest` (the TUI) and frames the
  `init` → `install` chain as scriptable mode.

### Changed

- **Reliability:** all HTTP helpers now abort after a default 30-second
  timeout when the caller does not provide an `AbortSignal`, raising
  `HttpError("HTTP_TIMEOUT")` instead of hanging.
- **HTTP errors:** 403 responses split into `HTTP_RATE_LIMIT` (when
  `X-RateLimit-Remaining: 0`) and `HTTP_AUTH_FAILED`, each with an
  actionable message. The rate-limit message includes the reset hint.
- **`maybeSyncAfterRemove`** now runs adapter syncs in parallel via
  `Promise.all` and returns the full aggregate; the CLI prints one line
  per adapter (was previously dropping all but the last adapter's
  outcome).
- **`toInstallError`** preserves the underlying `error.code` (HTTP error
  codes, `EACCES`, `ENOENT`, etc.) on the wrapped `InstallError`.
- **CLI parser** is now schema-driven via `STRING_FLAGS` / `BOOLEAN_FLAGS`
  / `KNOWN_FLAGS` sets. Unknown flags raise `CliError("UNKNOWN_FLAG")`
  with a Levenshtein-based "did you mean" suggestion (typos like
  `--scop=global` are no longer silently accepted).
- **CLI parser** detects missing values for string flags and raises
  `CliError("MISSING_FLAG_VALUE")` naming the offending flag.
- **CLI parser** honors the literal `--` end-of-options sentinel and
  exposes everything after it via `ParsedArgs.positionalAfter`, so
  `skillex run x:cmd -- --foo` forwards `--foo` to the underlying script
  without flag interpretation.
- **CLI dispatcher** suggests the closest match for unknown commands
  (e.g. `skillex insall git-master` → `Did you mean: install?`).
- **`parseBooleanFlag`** error now names the flag and lists every accepted
  value: `Invalid value "maybe" for --auto-sync. Use true, false, yes,
  no, on, off, 1, or 0.`
- **`INSTALL_NO_TARGETS`** (`skillex install` with no args) now prints a
  3-line inline usage block instead of a one-liner hint.
- **`skillex doctor`** differentiates DNS, connection-refused, TLS,
  timeout, and 5xx failures and surfaces the underlying `error.message`
  instead of collapsing every failure into "GitHub API is unreachable".
- **`skillex init`** ends with a three-line "Next steps" block (TUI /
  starter pack / full catalog) instead of a single line. Suppressed when
  `--install-recommended` was used.
- **SkillDetailPage** action order rewritten following "primary action
  last": Sync (ghost) → Update (secondary, only when installed) →
  Install (primary) or Remove (danger).
- **Web UI Esc cascade** — the Esc key now follows a priority chain:
  ConfirmDialog → adapter dropdown → mobile drawer → CatalogPage
  selection. Each handler checks `event.defaultPrevented` before acting,
  so only one consumer fires per keypress.
- **Refactor:** `src/install.ts` (1326 LOC) split into `src/lockfile.ts`,
  `src/direct-github.ts`, `src/auto-sync.ts`, `src/downloader.ts`. Public
  `package.json#exports` and import paths preserved via re-exports.
- Consolidated SKILL.md frontmatter parsing on `parseSkillFrontmatter`
  (`src/skill.ts`); the duplicated inline parser in `src/catalog.ts` was
  removed.

### Fixed

- All remaining Portuguese user-facing strings translated to English: TUI
  prompt label, sync symlink-fallback warnings, runner errors,
  direct-install confirmation, non-TTY confirm prompt, filesystem path
  errors, and Web UI labels (sidebar, catalog, skill card buttons,
  detail page).
- Sync warnings now route through `output.warn` instead of bare
  `console.error` so they respect color and stream conventions.
- New `scripts/check-language.mjs` regression guard runs as part of
  `npm test` and fails CI if banned Portuguese tokens reappear in
  `src/**/*.ts` or `ui/src/**/*.{vue,ts}` without an explicit
  `i18n-allow:` annotation.
- `toLockfileSource` boolean expression no longer contains a duplicated
  `(label || repo === DEFAULT_REPO)` test (copy-paste artifact); behavior
  unchanged.
- **README** example at the search section now uses the canonical
  `--tag <tag>` flag instead of the silently-ignored `--tags`.
- **Web UI:** version badge in the sidebar reads the actual
  `package.json#version` at build time via
  `import.meta.env.VITE_SKILLEX_VERSION` instead of the previously
  hardcoded `v0.2.4` (with a tautological ternary).
- **Web UI:** dead `⌘K` hint badge removed (no shortcut was wired) — and
  brought back once `Cmd+K` was actually implemented.
- **Web UI:** misleading "Oficial" badge that every skill card displayed
  (without any verification model) removed.
- **Web UI:** mobile (≤680 px) sidebar no longer disappears entirely.
- **Web UI:** `Remover` and `Carregando detalhes...` strings on the detail
  page translated to English.

### Security

- **Token confinement:** `Authorization: Bearer ${GITHUB_TOKEN}` is only
  attached when the request host is `api.github.com`,
  `raw.githubusercontent.com`, or any `*.githubusercontent.com` mirror.
  Tokens are no longer leaked to third-party `--catalog-url` targets.
- **File mode:** `~/.askillrc.json` (which may contain `githubToken`) is
  written with mode `0o600`. Existing world-readable files are tightened
  on next save with a one-time warning.
- **Lockfile path safety:** `removeSkill` validates `metadata.path`
  against the managed skills store before deleting; tampered lockfile
  paths raise `INSTALL_PATH_UNSAFE` instead of removing arbitrary
  directories.
- **Symlink confinement:** sync per-skill symlinks now refuse targets
  that resolve outside the workspace state directory.
- **Direct-install ref:** `parseDirectGitHubRef` validates the ref segment
  against `^[A-Za-z0-9_.\-/]+$` and rejects empty refs after `@`;
  previously dangerous refs would land in the lockfile.
- **Web UI avatars:** skill author avatars are now a deterministic
  CSS-only initials chip. The previous `<img>` to `dicebear.com` is gone
  — the UI works offline and no longer leaks page-load telemetry to a
  third-party host.

### Performance

- **Parallel file downloads:** `downloadSkillFiles` fetches every file in
  a skill via `Promise.all` instead of a sequential loop. Multi-file
  skills now scale with bandwidth instead of file count.

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

[Unreleased]: https://github.com/lgili/skillex/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/lgili/skillex/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/lgili/skillex/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/lgili/skillex/compare/v0.2.5...v0.3.0
[0.2.5]: https://github.com/lgili/skillex/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/lgili/skillex/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/lgili/skillex/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/lgili/skillex/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/lgili/skillex/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/lgili/skillex/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/lgili/skillex/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/lgili/skillex/releases/tag/v0.1.0
