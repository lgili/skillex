## ADDED Requirements

### Requirement: English-Only User-Facing Strings
All user-facing strings produced by the CLI — command output, error messages, warnings, help text, and progress indicators — SHALL be written in English. No strings in any other language SHALL appear in any output.

#### Scenario: Successful command output is in English
- **WHEN** any `askill` command completes successfully
- **THEN** all printed text including success messages and summaries is in English

#### Scenario: Error messages are in English
- **WHEN** a `CliError`, `InstallError`, `CatalogError`, `SyncError`, or `AdapterNotFoundError` is caught and printed
- **THEN** the message displayed to the user is in English

#### Scenario: Help text is in English
- **WHEN** `askill help` or `askill <command> --help` is executed
- **THEN** all descriptions, flag names, and examples printed are in English

### Requirement: Structured Output Module
The CLI SHALL route all user-facing output through a dedicated `src/output.ts` module that enforces language consistency and enables features such as color, verbosity filtering, and JSON mode.

#### Scenario: All output goes through output module
- **WHEN** any command runs
- **THEN** no bare `console.log` or `console.error` calls exist in `src/cli.ts`, `src/install.ts`, `src/sync.ts`, `src/catalog.ts`, or `src/adapters.ts`

#### Scenario: output.error prints to stderr
- **WHEN** `output.error("Something went wrong")` is called
- **THEN** the message is written to `process.stderr`, not `process.stdout`
