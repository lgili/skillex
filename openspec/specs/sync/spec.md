# sync Specification

## Purpose
TBD - created by archiving change refactor-typescript-migration. Update Purpose after archive.
## Requirements
### Requirement: Typed Sync Target
Each adapter sync target SHALL be described by the `SyncTarget` interface with fields `adapter: string`, `filePath: string`, and `mode: "managed-block" | "managed-file"`.

#### Scenario: Sync target satisfies interface
- **WHEN** `syncAdapterFiles()` reads the sync targets for an adapter
- **THEN** each target satisfies `SyncTarget`
- **AND** TypeScript compilation rejects a `mode` value outside the allowed union

### Requirement: Typed Sync Result
`syncAdapterFiles()` SHALL be typed as returning `Promise<SyncResult>` where `SyncResult` has fields `adapter: string`, `targetPath: string`, `changed: boolean`, and `diff: string`.

#### Scenario: Successful sync returns typed results
- **WHEN** `syncAdapterFiles()` resolves without errors
- **THEN** the result satisfies `SyncResult` with `changed` set correctly
- **AND** any write failure raises a typed `SyncError`

### Requirement: Typed Dry-Run Preview
`prepareSyncAdapterFiles()` SHALL be typed as returning `Promise<PreparedSyncResult>` where the result includes `adapter`, `targetPath`, `currentContent`, `nextContent`, and `diff`.

#### Scenario: Preview returns before/after for each target
- **WHEN** `prepareSyncAdapterFiles()` resolves
- **THEN** the result contains non-null current and next content strings plus the rendered diff

### Requirement: TSDoc on Sync Exports
Every exported function in `src/sync.ts` SHALL have a TSDoc comment describing parameters, return type, and side effects.

#### Scenario: IDE shows documentation on hover
- **WHEN** a developer hovers over `syncAdapterFiles` in a TypeScript-aware editor
- **THEN** the editor displays the TSDoc description and return type `Promise<SyncResult>`

