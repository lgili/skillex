## ADDED Requirements

### Requirement: Upfront --repo Validation
The `init` command SHALL validate the presence and format of `--repo` before writing any file or making any network call, and SHALL exit with a clear, actionable error message if it is missing or malformed.

#### Scenario: init without --repo fails immediately
- **WHEN** `askill init` is executed without `--repo`
- **THEN** the CLI prints "Missing required flag: --repo <owner/repo>" to stderr
- **AND** exits with code 1
- **AND** no files are written to disk

#### Scenario: init with malformed --repo fails immediately
- **WHEN** `askill init --repo not-valid-format` is executed
- **THEN** the CLI prints "Invalid repository format. Expected: owner/repo or a GitHub URL." to stderr
- **AND** exits with code 1 before any network call is made

### Requirement: Post-Init Next-Step Guidance
After a successful `init`, the CLI SHALL print a structured summary of what was configured and suggest the next command the user should run.

#### Scenario: init prints a summary and next steps
- **WHEN** `askill init --repo owner/repo` succeeds
- **THEN** the CLI prints the configured repo, the active adapter (or a note that none was detected), and the message "Next: run 'askill list' to browse available skills"

### Requirement: Adapter Detection Failure Guidance
When no adapter is detected in the current directory, the CLI SHALL print an actionable message listing all available adapter IDs and how to specify one manually, instead of silently recording an empty adapter list.

#### Scenario: No adapter detected shows actionable message
- **WHEN** `askill init` or `askill sync` runs and no adapter markers are found
- **THEN** the CLI prints "No adapter detected in this directory."
- **AND** prints "Use --adapter <id> to specify one. Available: codex, copilot, cline, cursor, claude, gemini, windsurf"

### Requirement: Per-Skill Install Progress
The `install` command SHALL print incremental progress for each skill being processed in the format `[N/total] Installing <skill-id>...` so the user knows the operation is running.

#### Scenario: Install prints progress for each skill
- **WHEN** `askill install --all` is executed and 5 skills are available in the catalog
- **THEN** the CLI prints "[1/5] Installing <first-skill-id>..." through "[5/5] Installing <last-skill-id>..." as each skill is processed

#### Scenario: Single skill install shows progress
- **WHEN** `askill install git-master` is executed
- **THEN** the CLI prints "[1/1] Installing git-master..." before installing

### Requirement: .gitignore Created on Init
The `init` command SHALL create a `.agent-skills/.gitignore` file containing recommended ignore patterns so generated and cached files are not accidentally committed.

#### Scenario: .gitignore created with cache pattern
- **WHEN** `askill init --repo owner/repo` succeeds
- **THEN** `.agent-skills/.gitignore` exists and contains at least `.cache/`

#### Scenario: Existing .gitignore is not overwritten
- **WHEN** `askill init` runs and `.agent-skills/.gitignore` already exists
- **THEN** the existing file is left unchanged
