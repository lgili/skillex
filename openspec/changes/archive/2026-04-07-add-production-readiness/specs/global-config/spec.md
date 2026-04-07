## ADDED Requirements

### Requirement: Global User Config File
The CLI SHALL read a global configuration file at `~/.askillrc.json` supporting `defaultRepo`, `defaultAdapter`, `githubToken`, and `disableAutoSync` fields. Values from this file are used as fallbacks when the equivalent CLI flag or environment variable is not provided. CLI flags and environment variables SHALL always take precedence.

#### Scenario: defaultRepo used when --repo not provided
- **WHEN** `~/.askillrc.json` contains `{ "defaultRepo": "owner/repo" }` and `askill list` is run without `--repo`
- **THEN** the CLI uses `"owner/repo"` as the catalog source

#### Scenario: CLI flag overrides global config
- **WHEN** `~/.askillrc.json` contains `{ "defaultRepo": "owner/a" }` and `askill list --repo owner/b` is run
- **THEN** the CLI uses `"owner/b"` and ignores the global config value

#### Scenario: GITHUB_TOKEN env overrides config githubToken
- **WHEN** `~/.askillrc.json` contains `{ "githubToken": "config_token" }` and `GITHUB_TOKEN=env_token` is set
- **THEN** the CLI uses `"env_token"` for authentication

#### Scenario: Missing config file is silently ignored
- **WHEN** `~/.askillrc.json` does not exist and no CLI flags are provided
- **THEN** the CLI proceeds with built-in defaults and does not print an error

### Requirement: Config Set and Get Commands
The CLI SHALL provide `config set <key> <value>` and `config get <key>` sub-commands to manage `~/.askillrc.json` without requiring the user to edit the file manually.

#### Scenario: config set writes value to global config
- **WHEN** `askill config set defaultRepo owner/repo` is executed
- **THEN** `~/.askillrc.json` is created or updated so that `defaultRepo` equals `"owner/repo"`
- **AND** the CLI prints a confirmation: "Set defaultRepo = owner/repo in ~/.askillrc.json"

#### Scenario: config get reads existing value
- **WHEN** `~/.askillrc.json` contains `{ "defaultRepo": "owner/repo" }` and `askill config get defaultRepo` is executed
- **THEN** the CLI prints `"owner/repo"` to stdout

#### Scenario: config get reports unset key
- **WHEN** `askill config get defaultRepo` is executed and the key is not set in `~/.askillrc.json`
- **THEN** the CLI prints `(not set)` and exits with code 0

#### Scenario: config set rejects unknown keys
- **WHEN** `askill config set unknownKey value` is executed
- **THEN** the CLI prints an error listing the valid keys and exits with code 1

### Requirement: Config Precedence Documented in Help
The `config` command help text SHALL document the precedence order: CLI flag > environment variable > global config > built-in default.

#### Scenario: config --help shows precedence order
- **WHEN** `askill config --help` is executed
- **THEN** the output includes a line describing the precedence order of configuration sources
