# install Specification

## Purpose
TBD - created by archiving change refactor-typescript-migration. Update Purpose after archive.
## Requirements
### Requirement: Typed Lockfile State

The lockfile (`skills.json`) structure SHALL be described by the `LockfileState` TypeScript interface with typed fields: `formatVersion: number`, `createdAt: string`, `updatedAt: string`, `sources: LockfileSource[]`, `adapters: LockfileAdapters`, `settings: LockfileSettings`, `sync: SyncMetadata | null`, `syncMode: SyncWriteMode | null`, and `installed: Record<string, InstalledSkill>`.

#### Scenario: getInstalledSkills returns typed state with sources

- **WHEN** `getInstalledSkills()` resolves
- **THEN** the returned object satisfies `LockfileState`
- **AND** the lockfile contains a non-empty `sources` array instead of a single persisted `catalog` object

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

### Requirement: Support Local And Global Install State

Skillex SHALL support two install scopes: `local` for the current workspace and `global` for the current user account.

- Local state SHALL be rooted at `.agent-skills/` inside the current workspace.
- Global state SHALL be rooted at `~/.skillex/`.
- Both scopes SHALL persist a `skills.json` lockfile and a `skills/<skill-id>/` managed store.

#### Scenario: Initialize local state by default

- **WHEN** the user runs `skillex init` in a workspace
- **THEN** Skillex creates `.agent-skills/skills.json`
- **AND** does not create or modify `~/.skillex/skills.json`

#### Scenario: Initialize global state explicitly

- **WHEN** the user runs `skillex init --global --adapter codex`
- **THEN** Skillex creates `~/.skillex/skills.json`
- **AND** records `codex` as the active adapter for the global scope
- **AND** does not require a workspace `.agent-skills/skills.json` to exist

### Requirement: Scope Isolation For Installed Skills

Commands that mutate installed skills SHALL only affect the selected scope.

#### Scenario: Global install does not modify workspace state

- **WHEN** the user runs `skillex install create-skills --global`
- **THEN** the skill is recorded in `~/.skillex/skills.json`
- **AND** the managed files are stored under `~/.skillex/skills/create-skills/`
- **AND** `.agent-skills/skills.json` remains unchanged

#### Scenario: Local remove does not remove global install

- **WHEN** `create-skills` is installed in both scopes
- **AND** the user runs `skillex remove create-skills`
- **THEN** the local `.agent-skills/skills/create-skills/` directory is removed
- **AND** the global `~/.skillex/skills/create-skills/` directory remains present

