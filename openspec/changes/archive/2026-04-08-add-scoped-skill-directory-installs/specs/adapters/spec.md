## MODIFIED Requirements
### Requirement: Typed Adapter Configuration
Every adapter definition SHALL be described by the `AdapterConfig` TypeScript interface with typed fields for `id: string`, `label: string`, `markers: AdapterMarker[]`, `syncMode: "managed-block" | "managed-file" | "managed-directory"`, optional `syncTarget?: string`, optional `globalSyncTarget?: string`, and optional `legacySyncTargets?: string[]`.

#### Scenario: Known directory-native adapter lookup returns typed object
- **WHEN** `getAdapter("codex")` is called
- **THEN** it returns an object that satisfies `AdapterConfig`
- **AND** the object includes `syncMode: "managed-directory"`
- **AND** includes both a workspace `syncTarget` and a global `globalSyncTarget`

#### Scenario: Known file-based adapter lookup returns typed object
- **WHEN** `getAdapter("cursor")` is called
- **THEN** it returns an object that satisfies `AdapterConfig`
- **AND** the object includes `syncMode: "managed-file"`
- **AND** may omit `globalSyncTarget`
