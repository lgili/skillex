## ADDED Requirements

### Requirement: Typed Filesystem Utilities
All functions in `src/fs.ts` SHALL have explicit TypeScript parameter and return types. `readJson` SHALL be a generic function `readJson<T>(path: string): Promise<T | null>`.

#### Scenario: readJson returns generic typed result
- **WHEN** `readJson<LockfileState>(path)` resolves with a valid file
- **THEN** TypeScript infers the return type as `LockfileState | null`
- **AND** accessing a field absent from `LockfileState` is a compile error

#### Scenario: Path traversal throws ValidationError
- **WHEN** `assertSafeRelativePath()` receives a path containing `../`
- **THEN** it throws a `ValidationError` (not a generic `Error`) whose message identifies the unsafe path

### Requirement: Typed HTTP Client
All functions in `src/http.ts` SHALL be generic: `fetchJson<T>(url: string): Promise<T>` and `fetchOptionalJson<T>(url: string): Promise<T | null>`.

#### Scenario: fetchJson returns typed value
- **WHEN** `fetchJson<SkillManifest[]>(url)` resolves
- **THEN** TypeScript infers the return as `SkillManifest[]` without a cast

#### Scenario: fetchOptionalJson returns null on 404
- **WHEN** `fetchOptionalJson<SkillManifest>(url)` receives a 404 response
- **THEN** it resolves to `null` and TypeScript enforces null-checking on the caller

### Requirement: Typed Configuration Constants
All exports from `src/config.ts` SHALL have explicit TypeScript types. `getStatePaths()` SHALL return a named `StatePaths` interface with fields `stateDir: string` and `lockfilePath: string`.

#### Scenario: getStatePaths returns typed object
- **WHEN** `getStatePaths(cwd)` is called
- **THEN** the returned object satisfies `StatePaths`
- **AND** TypeScript compilation rejects access to fields absent from `StatePaths`

### Requirement: TSDoc on Utility Exports
Every exported function in `src/config.ts`, `src/fs.ts`, and `src/http.ts` SHALL have a TSDoc comment.

#### Scenario: IDE shows documentation on hover
- **WHEN** a developer hovers over `readJson` in a TypeScript-aware editor
- **THEN** the editor displays the generic signature and TSDoc description
