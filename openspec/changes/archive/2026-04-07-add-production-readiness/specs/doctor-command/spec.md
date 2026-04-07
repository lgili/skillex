## ADDED Requirements

### Requirement: Doctor Diagnostic Command
The CLI SHALL provide a `doctor` command that runs a series of environment and configuration checks, prints a `✓` or `✗` status line per check with a remediation hint on failure, and exits with code 1 if any non-warning check fails.

#### Scenario: All checks pass exits code 0
- **WHEN** `askill doctor` is executed in a correctly configured project with network access
- **THEN** every check prints a `✓` status line
- **AND** the CLI exits with code 0

#### Scenario: Any failed check exits code 1
- **WHEN** `askill doctor` runs and at least one required check fails
- **THEN** the failing check prints a `✗` status line with a one-line remediation hint
- **AND** the CLI exits with code 1

### Requirement: Doctor Covers Core Configuration Checks
The `doctor` command SHALL check at minimum: lockfile existence, catalog source configured, adapter detected, GitHub API reachable, and `GITHUB_TOKEN` presence with rate-limit tier note.

#### Scenario: Missing lockfile is reported with fix
- **WHEN** `askill doctor` runs and `.agent-skills/skills.json` does not exist
- **THEN** the lockfile check prints `✗ Lockfile not found`
- **AND** the hint reads "Run: askill init --repo <owner/repo>"

#### Scenario: Missing repo config is reported with fix
- **WHEN** `askill doctor` runs and no catalog source is configured in the lockfile
- **THEN** the repo check prints `✗ No catalog repository configured`
- **AND** the hint reads "Run: askill init --repo <owner/repo>"

#### Scenario: No adapter detected is reported with fix
- **WHEN** `askill doctor` runs and no adapter is in `adapters.active` or `adapters.detected`
- **THEN** the adapter check prints `✗ No adapter detected`
- **AND** the hint reads "Use --adapter <id> when running commands. Available: codex, copilot, cline, cursor, claude, gemini, windsurf"

#### Scenario: GitHub unreachable is reported with fix
- **WHEN** `askill doctor` runs and a HEAD request to `https://api.github.com` fails
- **THEN** the network check prints `✗ GitHub API unreachable`
- **AND** the hint reads "Check your internet connection or proxy settings"

#### Scenario: Token presence shown with rate limit tier
- **WHEN** `askill doctor` runs and `GITHUB_TOKEN` is set
- **THEN** the token check prints `✓ GitHub token set (authenticated — 5,000 req/hr)`

#### Scenario: Missing token shown as warning with tier
- **WHEN** `askill doctor` runs and `GITHUB_TOKEN` is not set
- **THEN** the token check prints `✓ No GitHub token (unauthenticated — 60 req/hr)`
- **AND** does not cause a non-zero exit on its own

### Requirement: Doctor Supports JSON Output
The `doctor` command SHALL support `--json` to emit results as a JSON object, enabling scripted environment validation in CI pipelines.

#### Scenario: doctor --json returns structured result
- **WHEN** `askill doctor --json` is executed
- **THEN** stdout contains a JSON object where each key is a check name and each value contains `passed: boolean`, `message: string`, and optional `hint: string`
- **AND** no decorative output appears in stdout
