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

### Requirement: Aggregate Sync Result for Multi-Adapter Workspaces

The sync implementation MUST return an aggregate result containing one entry per adapter when invoked across multiple detected adapters (such as from `maybeSyncAfterRemove` or auto-sync after install) rather than overwriting a shared variable in a sequential loop.

#### Scenario: Auto-sync after remove returns one result per adapter

- **WHEN** a workspace has `claude` and `codex` detected and the user
  removes a skill
- **THEN** the returned aggregate exposes a result entry for each adapter
- **AND** none of the per-adapter entries are dropped

#### Scenario: A failure in one adapter does not hide the others

- **WHEN** `claude` succeeds and `codex` fails during a multi-adapter
  sync
- **THEN** the aggregate result includes the success for `claude`
- **AND** includes the failure for `codex` with its error code
- **AND** the CLI prints both outcomes

### Requirement: English Sync Warnings and Dry-Run Output

The sync subsystem MUST emit all user-visible warnings (symlink fallback, missing adapter, dry-run banner) in English and route them through `output.warn` / `output.info` instead of bare `console.error`.

#### Scenario: Symlink fallback warning is in English

- **WHEN** the platform does not support symlinks and sync falls back to copy
- **THEN** the printed warning is in English and recommends the explicit `--mode copy` flag for repeatability

#### Scenario: Dry-run banner is in English

- **WHEN** the user runs `skillex sync --dry-run`
- **THEN** the dry-run banner and per-adapter preview lines are in English

