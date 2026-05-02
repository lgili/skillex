# cli Specification

## Purpose
TBD - created by archiving change refactor-typescript-migration. Update Purpose after archive.
## Requirements
### Requirement: Typed CLI Arguments
The argument parser SHALL produce a `ParsedArgs` typed object with fields `command?: string`, `positionals: string[]`, and `flags: Record<string, string | boolean>`.

#### Scenario: Parsed args satisfy interface
- **WHEN** a CLI command string is parsed
- **THEN** the result satisfies `ParsedArgs`
- **AND** TypeScript compilation catches any access to an undeclared field on the result

### Requirement: Typed Command Handlers
The CLI entrypoint SHALL expose a typed `main(argv: string[]): Promise<void>` function and SHALL throw a `CliError` for invalid input rather than calling `process.exit()` directly inside the handler body.

#### Scenario: Invalid command throws CliError
- **WHEN** an unknown command string is passed to the CLI dispatcher
- **THEN** a `CliError` is thrown with a message listing available commands

#### Scenario: Top-level handler exits with code 1 on CliError
- **WHEN** a `CliError` is caught by the top-level handler in `bin/skillex.js`
- **THEN** the process sets exit code `1` and prints the error message to stderr

### Requirement: TSDoc on CLI Exports
Every exported function in `src/cli.ts` SHALL have a TSDoc comment describing its parameters, return type, and thrown errors.

#### Scenario: IDE shows documentation on hover
- **WHEN** a developer imports a CLI function in a TypeScript project
- **THEN** the editor shows the TSDoc description and parameter types on hover

### Requirement: English-Only User-Facing Strings

The CLI MUST produce all user-facing output (stdout, stderr, prompts, error messages) exclusively in English. Internal identifiers, JSON keys, lockfile fields, and code comments MAY remain unaffected, but any string a user can see in their terminal MUST be English.

#### Scenario: Existing Portuguese strings are removed

- **WHEN** any CLI command is executed
- **THEN** the resulting output contains no Portuguese tokens such as `Aguarde`, `Instalar`, `Erro`, `cancelada`, `disponivel`, `Buscar`, `Habilidades`

#### Scenario: New contributions are gated

- **WHEN** the test suite runs
- **THEN** the language-check script scans `src/**/*.ts` and `ui/src/**/*.{vue,ts}` and fails the build if any banned token is present without an explicit `// i18n-allow` annotation

### Requirement: User Output Routed Through Output Helpers

All user-visible CLI output MUST pass through `src/output.ts` helpers (`output.info`, `output.success`, `output.warn`, `output.error`, `output.debug`). Direct calls to `console.log` or `console.error` for end-user messages are prohibited outside `bin/skillex.js` and `src/output.ts` itself.

#### Scenario: Bare console call is rejected

- **WHEN** a contributor adds a `console.error("…")` for user-visible text in a file inside `src/` other than `output.ts`
- **THEN** the lint or pre-commit check fails with a message pointing to the offending line

#### Scenario: Existing bare console calls are migrated

- **WHEN** the codebase is audited
- **THEN** every previously bare `console.error` carrying user-visible text is replaced with the appropriate `output.*` helper

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

### Requirement: Skill Preview Command

The CLI MUST provide a `show <id>` command that prints the manifest summary and the rendered SKILL.md content of a skill without installing it. The command MUST resolve cross-source ambiguity using the same rules as `install` (`--repo` disambiguator).

#### Scenario: Show renders the SKILL.md

- **WHEN** the user runs `skillex show git-master`
- **THEN** the manifest summary (name, version, author, tags, compatibility, file count) is printed
- **AND** the SKILL.md content is rendered to terminal-friendly text below a separator

#### Scenario: Raw output

- **WHEN** the user runs `skillex show git-master --raw`
- **THEN** the SKILL.md is printed verbatim (markdown unmodified)
- **AND** no manifest summary header is added

#### Scenario: JSON output

- **WHEN** the user runs `skillex show git-master --json`
- **THEN** the output is a single JSON object containing both the manifest fields and the raw SKILL.md string

#### Scenario: Ambiguous skill across sources

- **WHEN** the same skill id exists in two configured sources
- **THEN** the command raises `SHOW_AMBIGUOUS_SOURCE` and instructs the user to disambiguate with `--repo`

### Requirement: Recommended Starter Pack

The `init` command MUST accept an `--install-recommended` flag. When set, after the lockfile is created, the curated set defined in `src/recommended.ts` MUST be installed using the same code path as `install --all`, with identical progress output.

#### Scenario: Init with recommended pack

- **WHEN** the user runs `skillex init --install-recommended`
- **THEN** the lockfile is created
- **AND** every id in `RECOMMENDED_SKILL_IDS` is installed
- **AND** the install progress bar is rendered

#### Scenario: Recommended ids are stable

- **WHEN** the test suite runs
- **THEN** a snapshot test asserts the contents of `RECOMMENDED_SKILL_IDS` so changes are intentional

### Requirement: Improved Post-Init Guidance

The `init` command (without `--install-recommended`) MUST print a three-line "Next steps" block recommending the TUI, the recommended starter pack, and the full list — instead of a single line referring only to `skillex list`.

#### Scenario: Default post-init guidance

- **WHEN** `skillex init` completes successfully
- **THEN** the output ends with three lines:
  - `Browse and install interactively:  skillex`
  - `Install a curated starter pack:    skillex install --recommended`
  - `List the full catalog:             skillex list`

#### Scenario: Skipped when recommended is installed

- **WHEN** `skillex init --install-recommended` completes successfully
- **THEN** the three-line "Next steps" block is suppressed (the install summary stands alone)

### Requirement: --tags Alias for Search

The `search` command MUST accept `--tags` as a hidden alias of `--tag` so that the previously documented (and silently ignored) form continues to work.

#### Scenario: --tags forwards to --tag behavior

- **WHEN** the user runs `skillex search --tags workflow`
- **THEN** the search filters by the `workflow` tag identically to `--tag workflow`

#### Scenario: README documents the canonical form

- **WHEN** the README is rendered
- **THEN** the Search section shows `--tag <tag>` as the canonical flag

