## MODIFIED Requirements

### Requirement: Typed Lockfile State

The lockfile (`skills.json`) structure SHALL be described by the `LockfileState` TypeScript interface with typed fields: `formatVersion: number`, `createdAt: string`, `updatedAt: string`, `sources: LockfileSource[]`, `adapters: LockfileAdapters`, `settings: LockfileSettings`, `sync: SyncMetadata | null`, `syncMode: SyncWriteMode | null`, and `installed: Record<string, InstalledSkill>`.

#### Scenario: getInstalledSkills returns typed state with sources

- **WHEN** `getInstalledSkills()` resolves
- **THEN** the returned object satisfies `LockfileState`
- **AND** the lockfile contains a non-empty `sources` array instead of a single persisted `catalog` object

## ADDED Requirements

### Requirement: Migrate Legacy Single-Catalog Lockfiles

The installer SHALL read legacy lockfiles containing `catalog` and migrate them to `sources` on the next write.

#### Scenario: Legacy lockfile is upgraded transparently

- **WHEN** a workspace contains `.agent-skills/skills.json` with `catalog.repo` and `catalog.ref`
- **THEN** install-state operations continue to work without manual migration
- **AND** the next persisted lockfile writes an equivalent entry into `sources`

### Requirement: Initialize With A Default First-Party Source

The installer SHALL initialize new workspaces with `lgili/skillex@main` as the default source when no explicit repository override is provided.

#### Scenario: Init without repo seeds official source

- **WHEN** the user initializes a workspace without `--repo`
- **THEN** `.agent-skills/skills.json` is created with `sources[0]` set to `lgili/skillex` at ref `main`
- **AND** subsequent `list` and `install` commands can use the first-party catalog immediately

#### Scenario: Explicit repo override replaces the default seed for init

- **WHEN** the user runs `skillex init --repo myorg/my-skills`
- **THEN** the initialized workspace stores `myorg/my-skills` as the configured source for that workspace
- **AND** does not require `lgili/skillex` to be auto-added alongside the explicit source