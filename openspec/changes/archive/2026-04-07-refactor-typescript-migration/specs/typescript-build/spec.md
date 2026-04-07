## ADDED Requirements

### Requirement: TypeScript Compilation
The build system SHALL compile all TypeScript source files in `src/` to JavaScript in `dist/` using `tsc` with strict mode enabled (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`).

#### Scenario: Clean build produces output
- **WHEN** `npm run build` is executed on a clean repository
- **THEN** `tsc` exits with code 0 and emits `.js` files under `dist/`

#### Scenario: Type error fails the build
- **WHEN** a type mismatch is introduced in any source file
- **THEN** `tsc` exits with a non-zero code and reports the offending file and line number

### Requirement: Declaration File Emission
The build SHALL emit `.d.ts` declaration files alongside compiled output so that library consumers receive IDE autocomplete and compile-time type safety.

#### Scenario: Declaration files present after build
- **WHEN** `npm run build` completes successfully
- **THEN** a `.d.ts` file exists in `dist/` for every `.ts` source file under `src/`

### Requirement: Type Checking in CI
The CI pipeline SHALL run `tsc --noEmit` as a standalone `typecheck` step before tests execute on every pull request targeting `main`.

#### Scenario: Typecheck step runs before tests
- **WHEN** a pull request is opened against `main`
- **THEN** the CI workflow runs the `typecheck` step first and the `test` step second

#### Scenario: Type error blocks CI
- **WHEN** a type error exists in any source file
- **THEN** the `typecheck` step fails and tests do not run

### Requirement: Published Package Contains Only Compiled Output
The npm package SHALL include `dist/`, `bin/`, and `README.md`; raw TypeScript source files SHALL NOT be included in the published artifact.

#### Scenario: Pack dry-run shows correct files
- **WHEN** `npm pack --dry-run` is executed
- **THEN** the listed files include paths under `dist/` and `bin/`
- **AND** no `src/*.ts` files appear in the listing
