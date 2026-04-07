# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- All user-facing strings translated from Portuguese to English
- HTTP error messages rewritten to be actionable (rate limit, 404 with repo hint, 5xx retry suggestion)
- `--verbose` HTTP logging: URL and status code logged via `debug()` on every request

### Fixed
- `AdapterNotFoundError` message was in Portuguese; now reads "Unknown adapter: <id>"

## [0.2.0] - 2026-04-07

### Added
- Symlink sync mode: skills stored once in `.agent-skills/skills/<id>/` and symlinked to adapter targets with relative paths
- `run` command: execute skill scripts defined in `skill.json` via `scripts.<name>`
- Direct GitHub install: `skillex install owner/repo/path@ref` installs skills without a catalog
- Interactive TUI for `list` and `search` using `@inquirer/prompts`
- Context auto-inject: skills with `autoInject: true` are included automatically on every sync
- Compatibility aliases for all major AI agents: `codex`, `copilot`, `cline`, `cursor`, `claude`, `gemini`, `windsurf`

### Changed
- Full TypeScript migration: all source files converted to `.ts` with `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Module resolution updated to `NodeNext` with explicit `.js` import extensions

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
