## 1. Output Module (`src/output.ts`)
- [x] 1.1 Create `src/output.ts` with `success()`, `warn()`, `error()`, `info()`, `debug()` helpers using direct ANSI escape codes (Node ≥ 20.0.0 compatible; avoids `util.styleText` which requires 20.12+)
- [x] 1.2 Add automatic color disable when `NO_COLOR` env is set or `!process.stdout.isTTY`
- [x] 1.3 Add `isVerbose()` helper that reads a module-level flag set by the CLI on startup
- [x] 1.4 Export `setVerbose(v: boolean)` to be called by the argument parser when `--verbose` / `-v` is found

## 2. i18n — Translate All Strings to English
- [x] 2.1 Audit every `console.log`, `console.error`, error message, and help string in `src/cli.ts`, `src/install.ts`, `src/sync.ts`, `src/catalog.ts`, `src/adapters.ts`, `src/http.ts`
- [x] 2.2 Replace all Portuguese user-facing strings with English equivalents
- [x] 2.3 Translate all error class messages (`CliError`, `InstallError`, `CatalogError`, `SyncError`, `ValidationError`, `AdapterNotFoundError`)
- [x] 2.4 Replace all bare `console.log` / `console.error` calls with `output.*` equivalents
- [x] 2.5 Update test assertions that match on specific message strings

## 3. CLI Argument Parser Improvements
- [x] 3.1 Add `--verbose` / `-v` global flag; call `setVerbose(true)` before command dispatch
- [x] 3.2 Add `--json` global flag; store in parsed args; commands that support it skip decorative output
- [x] 3.3 Add command aliases: `ls` → `list`, `rm` → `remove`, `uninstall` → `remove`
- [x] 3.4 Add per-command `--help` flag: if `--help` present after a known command, print `command.help` and exit 0
- [x] 3.5 Add top-level `help` string to each command handler object in `src/cli.ts`

## 4. Onboarding UX
- [x] 4.1 Add upfront `--repo` presence check at the top of the `init` handler; exit 1 with "Missing required flag: --repo <owner/repo>" if absent
- [x] 4.2 Add `--repo` format validation before any network call; exit 1 with "Invalid repository format. Expected: owner/repo or a GitHub URL." if malformed
- [x] 4.3 After successful `init`, print a multi-line summary: repo configured, adapter detected (or suggestion), and "Next: run 'skillex list' to browse available skills"
- [x] 4.4 When no adapter is detected, print "No adapter detected. Use --adapter <id> to specify one. Available: codex, copilot, cline, cursor, claude, gemini, windsurf"
- [x] 4.5 Add install progress output in `installSkills()`: print "[N/total] Installing <skill-id>..." for each skill
- [x] 4.6 Add `.agent-skills/.gitignore` creation to `initProject()` with contents: `.cache/\n*.log`

## 5. Network Resilience
- [x] 5.1 Read `process.env.GITHUB_TOKEN` in `src/http.ts`; add `Authorization: Bearer <token>` header when present
- [x] 5.2 Replace HTTP 403 error message with "GitHub API rate limit exceeded or access denied. Set the GITHUB_TOKEN environment variable to authenticate."
- [x] 5.3 Replace HTTP 404 error message with "Repository or file not found. Check the --repo value is correct and the repository is public."
- [x] 5.4 Add `--verbose` HTTP logging in `src/http.ts`: call `output.debug()` with URL and response status before returning
- [x] 5.5 Create cache helpers in `src/catalog.ts`: `readCatalogCache(sourceHash)` and `writeCatalogCache(sourceHash, skills)`
- [x] 5.6 Compute cache key as SHA-256 of the catalog source URL; store at `.agent-skills/.cache/<hash>.json` with `{ expiresAt, data }` shape
- [x] 5.7 Check cache at the top of `loadCatalog()`; bypass when TTL expired or `--no-cache` flag is set

## 6. `doctor` Command
- [x] 6.1 Add `doctor` command handler in `src/cli.ts`
- [x] 6.2 Check 1 — Lockfile: `.agent-skills/skills.json` exists; on fail suggest `skillex init --repo owner/repo`
- [x] 6.3 Check 2 — Repo configured: `catalog.repo` field present in lockfile; on fail suggest `skillex init --repo owner/repo`
- [x] 6.4 Check 3 — Adapter detected: at least one adapter in `adapters.active` or `adapters.detected`; on fail suggest `--adapter <id>`
- [x] 6.5 Check 4 — GitHub reachable: HEAD request to `https://api.github.com`; on fail suggest checking connectivity
- [x] 6.6 Check 5 — Token: print ✓ + "authenticated (5000 req/hr)" if `GITHUB_TOKEN` set, else ✓ (warning) + "unauthenticated (60 req/hr)"
- [x] 6.7 Check 6 — Cache: report if catalog cache is present and whether it is fresh or expired
- [x] 6.8 Exit with code 1 if any non-warning check fails; support `--json` flag for machine-readable output

## 7. Global Config (`src/user-config.ts`)
- [x] 7.1 Create `src/user-config.ts` with `readUserConfig()` and `writeUserConfig()` using `os.homedir()` to resolve `~/.askillrc.json`
- [x] 7.2 Define `UserConfig` interface: `defaultRepo?: string`, `defaultAdapter?: string`, `githubToken?: string`, `disableAutoSync?: boolean`
- [x] 7.3 Merge global config into `ProjectOptions` at CLI startup; CLI flags take precedence over global config
- [x] 7.4 `GITHUB_TOKEN` env var takes precedence over `githubToken` in global config
- [x] 7.5 Add `config` command with `set <key> <value>` and `get <key>` sub-commands in `src/cli.ts`
- [x] 7.6 `config set` writes to `~/.askillrc.json`; `config get` prints the value or "(not set)" if absent
- [x] 7.7 Write tests: merge precedence (flag > env > global config), `config set` persists, `config get` reads

## 8. Repository Hygiene Files
- [x] 8.1 Create `LICENSE` file with MIT license text and project author
- [x] 8.2 Create `CHANGELOG.md` following Keep a Changelog format with entries for all published versions
- [x] 8.3 Create `CONTRIBUTING.md` with issue templates, PR guidelines, and development setup instructions
- [x] 8.4 Create `SECURITY.md` with private vulnerability reporting instructions
- [x] 8.5 Create `.npmignore` excluding: `test/`, `openspec/`, `skills/`, `.github/`, `*.test.ts`, `.test-dist/`, `CONTRIBUTING.md`, `SECURITY.md`
- [x] 8.6 Verify `npm pack --dry-run` shows only `dist/`, `bin/`, `README.md`, `LICENSE`, `CHANGELOG.md`, `package.json`
