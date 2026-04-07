# adapters Specification

## Purpose
TBD - created by archiving change refactor-typescript-migration. Update Purpose after archive.
## Requirements
### Requirement: Typed Adapter Configuration
Every adapter definition SHALL be described by the `AdapterConfig` TypeScript interface with typed fields for `id: string`, `label: string`, `markers: AdapterMarker[]`, `syncTarget: string`, optional `legacySyncTargets?: string[]`, and `syncMode: SyncMode`.

#### Scenario: Known adapter lookup returns typed object
- **WHEN** `getAdapter(id)` is called with a known adapter ID such as `"claude"`
- **THEN** it returns an object that satisfies `AdapterConfig` with all fields present and correctly typed

#### Scenario: Unknown adapter throws typed error
- **WHEN** `getAdapter(id)` is called with an unrecognised ID
- **THEN** it throws an `AdapterNotFoundError` whose `message` includes the unknown ID
- **AND** the error is not a generic `Error`

### Requirement: Typed Detection Result
`detectAdapters(cwd: string)` SHALL be typed as returning `Promise<string[]>` where every resolved element is a canonical adapter identifier.

#### Scenario: Detected adapters satisfy interface
- **WHEN** `detectAdapters` resolves in a workspace that contains adapter markers
- **THEN** every element in the returned array is a typed adapter ID string
- **AND** the list is ordered by adapter specificity

### Requirement: Typed Adapter State
`resolveAdapterState()` SHALL return a typed `AdapterState` object with `active: string | null` and `detected: string[]` fields.

#### Scenario: Adapter state has correct shape
- **WHEN** `resolveAdapterState()` resolves
- **THEN** the result satisfies `AdapterState` with `active` typed as a canonical adapter ID or `null`
- **AND** `detected` typed as an array of canonical adapter IDs

### Requirement: TSDoc on Adapter Exports
Every exported function in `src/adapters.ts` SHALL have a TSDoc comment describing its parameters, return type, and any thrown errors.

#### Scenario: IDE shows documentation on hover
- **WHEN** a developer hovers over `detectAdapters` in a TypeScript-aware editor
- **THEN** the editor displays the TSDoc description and typed parameter/return information

