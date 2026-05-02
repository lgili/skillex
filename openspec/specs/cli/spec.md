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

