## ADDED Requirements

### Requirement: Per-Command Help Flag
Every CLI command SHALL support a `--help` flag that prints command-specific usage, all available flags with descriptions, and at least one example invocation, then exits with code 0 without executing the command.

#### Scenario: --help after a command prints usage
- **WHEN** `askill install --help` is executed
- **THEN** the CLI prints the description of `install`, lists flags (`--all`, `--repo`, `--adapter`, `--yes`), and shows an example
- **AND** exits with code 0 without installing anything

#### Scenario: --help works for all commands
- **WHEN** `askill <command> --help` is executed for any known command
- **THEN** command-specific help is printed and the command does not run

### Requirement: Verbose Debug Output
The CLI SHALL support a `--verbose` / `-v` global flag that prints debug-level information including HTTP requests made, adapter detection results, files written, and cache hits/misses.

#### Scenario: --verbose shows HTTP requests
- **WHEN** `askill list --verbose` is executed
- **THEN** each URL being fetched is printed to stderr prefixed with `[debug]`

#### Scenario: --verbose shows adapter detection
- **WHEN** `askill init --repo owner/repo --verbose` is executed
- **THEN** the markers checked and the resulting adapter decision are printed as `[debug]` lines

#### Scenario: No debug output without --verbose
- **WHEN** any command is executed without `--verbose`
- **THEN** no `[debug]` lines appear in stdout or stderr

### Requirement: ANSI Color Output
The CLI SHALL use ANSI colors for output categories: green for success, yellow for warnings, red for errors, and dim for debug lines. Colors SHALL be automatically disabled when `NO_COLOR` is set in the environment or when stdout is not a TTY.

#### Scenario: Success message is green
- **WHEN** a skill is installed successfully
- **THEN** the success confirmation line is printed in green

#### Scenario: Error message is red
- **WHEN** a `CliError` is caught at the top level
- **THEN** the error message is printed in red to stderr

#### Scenario: Colors disabled when piped
- **WHEN** the CLI output is piped (`askill list | cat`)
- **THEN** no ANSI escape codes appear in the output

#### Scenario: Colors disabled via NO_COLOR
- **WHEN** `NO_COLOR=1 askill list` is executed in a TTY
- **THEN** no ANSI escape codes appear in the output

### Requirement: Command Aliases
The CLI SHALL support shorthand command aliases so users can use natural abbreviations without receiving an "unknown command" error.

#### Scenario: ls alias runs list
- **WHEN** `askill ls` is executed
- **THEN** the behavior is identical to `askill list`

#### Scenario: rm alias runs remove
- **WHEN** `askill rm my-skill` is executed
- **THEN** the behavior is identical to `askill remove my-skill`

#### Scenario: uninstall alias runs remove
- **WHEN** `askill uninstall my-skill` is executed
- **THEN** the behavior is identical to `askill remove my-skill`

### Requirement: Machine-Readable JSON Output
The `list`, `search`, `status`, and `doctor` commands SHALL support a `--json` flag that writes results as valid JSON to stdout and suppresses all decorative text and ANSI codes.

#### Scenario: list --json returns a JSON array
- **WHEN** `askill list --json` is executed
- **THEN** stdout contains a valid JSON array of skill objects
- **AND** no decorative text, color codes, or progress lines appear in stdout

#### Scenario: doctor --json returns a JSON object
- **WHEN** `askill doctor --json` is executed
- **THEN** stdout contains a JSON object where each key is a check name and each value has `passed: boolean` and `message: string`
