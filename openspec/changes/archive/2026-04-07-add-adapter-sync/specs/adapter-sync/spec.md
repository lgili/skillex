## ADDED Requirements

### Requirement: Sync Installed Skills To Active Adapter

The system SHALL provide a command to synchronize installed skills into files consumed by the active adapter.

#### Scenario: Sync using active adapter

- **WHEN** the user runs `askill sync`
- **THEN** the CLI synchronizes installed skills to the adapter stored as active in `.agent-skills/skills.json`

#### Scenario: Override adapter during sync

- **WHEN** the user runs `askill sync --adapter cursor`
- **THEN** the CLI synchronizes installed skills to the `cursor` adapter targets
- **AND** does not require changing the stored active adapter

### Requirement: Preserve Manual Content In Shared Files

The system SHALL preserve user-authored content in shared instruction files while updating the managed skills content.

#### Scenario: Sync into existing AGENTS.md

- **WHEN** the workspace already contains manual content in `AGENTS.md`
- **THEN** the CLI updates only its managed block
- **AND** leaves unrelated user content unchanged

#### Scenario: Sync into existing Copilot instructions

- **WHEN** the workspace already contains manual content in `.github/copilot-instructions.md`
- **THEN** the CLI updates only its managed block
- **AND** leaves unrelated user content unchanged

### Requirement: Generate Adapter-Specific Files

The system SHALL write synchronized skills to adapter-specific target files.

#### Scenario: Sync to Codex

- **WHEN** the active adapter is `codex`
- **THEN** the CLI writes the managed skills block to `AGENTS.md`

#### Scenario: Sync to Copilot

- **WHEN** the active adapter is `copilot`
- **THEN** the CLI writes the managed skills block to `.github/copilot-instructions.md`

#### Scenario: Sync to Cline

- **WHEN** the active adapter is `cline`
- **THEN** the CLI writes a generated rules file to `.clinerules/askill-skills.md`

#### Scenario: Sync to Cursor

- **WHEN** the active adapter is `cursor`
- **THEN** the CLI writes a generated project rule to `.cursor/rules/askill-skills.mdc`

### Requirement: Persist Sync Metadata

The system SHALL record synchronization metadata in the local lockfile.

#### Scenario: Sync updates metadata

- **WHEN** the user runs `askill sync`
- **THEN** the CLI records the synchronized adapter, target path, and timestamp in `.agent-skills/skills.json`
