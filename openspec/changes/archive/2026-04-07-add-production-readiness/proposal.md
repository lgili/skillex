## Why
A deep audit of the codebase revealed several gaps that prevent professional adoption: all user-facing strings are in Portuguese (excluding non-Brazilian users), the first-run experience provides no guidance after `init`, legal files are missing (no LICENSE file despite MIT declaration in package.json), error messages are cryptic on network failures, and standard professional CLI features (per-command help, color output, `--verbose`, GitHub token support) are absent. These issues must be resolved before a credible v1.0 release.

## What Changes
- Translate every user-facing string (help text, error messages, progress output) from Portuguese to English
- Add upfront `--repo` validation in `init` before any file write or network call
- Print next-step guidance and adapter suggestions after a successful `init`
- Add per-skill progress feedback during `install` (`[1/5] Installing git-master...`)
- Create `.agent-skills/.gitignore` automatically on `init`
- Add missing legal/documentation files: `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.npmignore`
- Add per-command `--help` flag (`askill install --help`)
- Add `--verbose` / `-v` global flag for debug output
- Add ANSI color output (green/yellow/red) via Node.js built-in `util.styleText()` with automatic NO_COLOR / non-TTY fallback
- Add command aliases: `ls` → `list`, `rm` / `uninstall` → `remove`
- Add `--json` flag for machine-readable output on `list`, `search`, `status`, `doctor`
- Support `GITHUB_TOKEN` environment variable for authenticated GitHub API requests
- Replace generic HTTP error messages with actionable guidance (403 → rate limit hint, 404 → repo check hint)
- Add local catalog cache at `.agent-skills/.cache/` with 5-minute TTL and `--no-cache` override
- Add `askill doctor` diagnostic command
- Add global user config at `~/.askillrc.json` with `config set` / `config get` sub-commands

## Impact
- Affected capabilities: `cli-i18n`, `onboarding-ux`, `repo-hygiene`, `cli-ergonomics`, `network-resilience`, `doctor-command`, `global-config`
- Affected code: `src/cli.ts`, `src/http.ts`, `src/catalog.ts`, `src/install.ts`, `src/adapters.ts`; new module `src/output.ts`; new module `src/user-config.ts`; repository root files
- No breaking changes to existing command behavior, lockfile schema, or sync output format
