## ADDED Requirements

### Requirement: Schema-Driven Flag Parsing

The CLI argv parser MUST consume a per-command flag schema and reject any flag not declared in that schema. Each schema entry MUST specify the flag name, optional alias, type (`string` | `boolean` | `stringArray`), description, and an optional `hidden` marker for advanced flags.

#### Scenario: Declared flag is parsed correctly

- **WHEN** a user passes a flag declared in the command schema
- **THEN** the parser places the value into the typed flag bag
- **AND** the handler receives a fully typed object

#### Scenario: Undeclared flag triggers error

- **WHEN** a user passes a flag that is not present in any schema entry for the resolved command
- **THEN** the parser raises `CliError` with code `UNKNOWN_FLAG`
- **AND** the message lists the closest match within Levenshtein distance ≤ 2 if any

#### Scenario: Missing value for string flag

- **WHEN** a flag declared as `type: "string"` is consumed without a following value (next token starts with `-` or is absent)
- **THEN** the parser raises `CliError` with code `MISSING_FLAG_VALUE`
- **AND** the message names the offending flag

#### Scenario: End-of-options sentinel

- **WHEN** the argv contains a literal `--` token
- **THEN** all tokens after `--` are placed in a separate `positionalAfter` array delivered to the handler
- **AND** they are not interpreted as flags

### Requirement: Unknown Command Suggestion

The CLI dispatcher MUST suggest the closest command name when a user types an unrecognized command, including aliases (`ls`, `rm`, `uninstall`, `browse`, `tui`).

#### Scenario: Typo in known command

- **WHEN** the user runs `skillex insall git-master`
- **THEN** the dispatcher prints `Unknown command: insall. Did you mean: install?`
- **AND** exits with a non-zero code

#### Scenario: No close match

- **WHEN** the user runs `skillex zzzzzz`
- **THEN** the dispatcher prints `Unknown command: zzzzzz. Run 'skillex --help' to list commands.`

### Requirement: Actionable Boolean Flag Error

The parser MUST include the offending flag name and the full list of accepted values when a boolean flag receives an unparseable value.

#### Scenario: Bad boolean for --auto-sync

- **WHEN** the user runs `skillex init --auto-sync=maybe`
- **THEN** the error message is `Invalid value "maybe" for --auto-sync. Use true, false, yes, no, 1, or 0.`

### Requirement: Inline Help on Empty Install

The `install` command MUST display a 3-line inline usage block when invoked with no skill ids, no `--all`, and no direct GitHub reference, in addition to setting the `INSTALL_NO_TARGETS` exit code.

#### Scenario: Empty install command

- **WHEN** the user runs `skillex install` with no targets
- **THEN** the error block displays one example for catalog install, one for `--all`, and one for direct GitHub install

### Requirement: Doctor Error Differentiation

The `doctor` GitHub-reachability check MUST distinguish DNS failures, connection refusals, TLS handshake failures, 4xx responses, and 5xx responses, emitting a different hint for each. The underlying error message MUST be appended for diagnostics.

#### Scenario: DNS failure

- **WHEN** the GitHub probe fails because of DNS resolution (e.g. `EAI_AGAIN`)
- **THEN** the doctor output line reads `DNS lookup failed for api.github.com — check your network or DNS resolver`

#### Scenario: TLS failure

- **WHEN** the probe fails because of a TLS handshake (e.g. `CERT_HAS_EXPIRED`)
- **THEN** the doctor output line reads `TLS handshake failed — check system time or proxy interception`

#### Scenario: 5xx response

- **WHEN** the probe receives a 5xx HTTP status
- **THEN** the doctor output line reads `GitHub returned a server error (status N) — try again in a moment`

### Requirement: Dry-Run Exit Code

The `sync` command MUST accept a `--exit-code` flag. When set, the command MUST exit with code `1` whenever the dry-run preview reports at least one adapter as `changed`, mirroring the `git diff --exit-code` convention so CI can detect drift.

#### Scenario: Dry-run with no drift

- **WHEN** `skillex sync --dry-run --exit-code` runs and no adapter would change
- **THEN** the command exits with code `0`

#### Scenario: Dry-run with drift

- **WHEN** `skillex sync --dry-run --exit-code` runs and at least one adapter would change
- **THEN** the command exits with code `1`
- **AND** the diff is printed as before
