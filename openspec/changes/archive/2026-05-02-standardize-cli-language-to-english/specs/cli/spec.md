## ADDED Requirements

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
