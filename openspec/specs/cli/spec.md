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

