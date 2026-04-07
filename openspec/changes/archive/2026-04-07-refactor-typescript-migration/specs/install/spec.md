## ADDED Requirements

### Requirement: Typed Lockfile State
The lockfile (`skills.json`) structure SHALL be described by the `LockfileState` TypeScript interface with typed fields: `formatVersion: number`, `createdAt: string`, `updatedAt: string`, `catalog: LockfileCatalog`, `adapters: LockfileAdapters`, `settings: LockfileSettings`, `sync: SyncMetadata | null`, and `installed: Record<string, InstalledSkill>`.

#### Scenario: getInstalledSkills returns typed state
- **WHEN** `getInstalledSkills()` resolves
- **THEN** the returned object satisfies `LockfileState`
- **AND** TypeScript compilation rejects any write that omits a required field

### Requirement: Typed Installed Skill Entry
Each entry in `LockfileState.installed` SHALL conform to `InstalledSkill` with fields `name: string`, `version: string`, `path: string`, `installedAt: string`, `compatibility: string[]`, and `tags: string[]`.

#### Scenario: Installed entry has correct shape
- **WHEN** `installSkills()` resolves after successfully installing a skill
- **THEN** the new entry in `skills.json` satisfies `InstalledSkill` with all required fields present

### Requirement: Typed Error Classes for Installation
`installSkills()`, `updateInstalledSkills()`, and `removeSkills()` SHALL throw `InstallError` (not a generic `Error`) on failure, with a `code: string` field classifying the reason.

#### Scenario: Missing skill throws InstallError
- **WHEN** `installSkills()` is called with a skill ID absent from the catalog
- **THEN** an `InstallError` is thrown with `code: "SKILL_NOT_FOUND"`
- **AND** the error message includes the missing skill ID

#### Scenario: Corrupt lockfile throws InstallError
- **WHEN** `skills.json` exists but contains invalid JSON
- **THEN** reading it fails through an `InstallError` rather than a generic `Error`

### Requirement: TSDoc on Install Exports
Every exported function in `src/install.ts` SHALL have a TSDoc comment describing parameters, return type, and thrown errors.

#### Scenario: IDE shows documentation on hover
- **WHEN** a developer hovers over `installSkills` in a TypeScript-aware editor
- **THEN** the editor displays the function signature, TSDoc description, and thrown error types
