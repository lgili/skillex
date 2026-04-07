# adapter-sync Specification

## Purpose
TBD - created by archiving change add-adapter-sync. Update Purpose after archive.
## Requirements
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

### Requirement: Preview Sync Changes Before Writing

The system SHALL provide a dry-run mode for synchronization that previews file changes without writing them.

#### Scenario: Preview sync without writing files

- **WHEN** the user runs `askill sync --dry-run`
- **THEN** the CLI shows the target adapter and target path
- **AND** presents a textual diff or preview of the pending changes
- **AND** does not modify the target file

### Requirement: Support Workspace Auto Sync

The system SHALL support an optional workspace setting that triggers synchronization automatically after local skill mutations.

#### Scenario: Enable auto sync during init

- **WHEN** the user runs `askill init --auto-sync`
- **THEN** the CLI stores the workspace preference to enable automatic synchronization

#### Scenario: Auto sync after install

- **WHEN** auto sync is enabled and the user runs `askill install git-master`
- **THEN** the CLI installs the skill locally
- **AND** synchronizes the installed skills to the active adapter target

#### Scenario: Auto sync after update

- **WHEN** auto sync is enabled and the user runs `askill update`
- **THEN** the CLI updates the local skills
- **AND** synchronizes the installed skills to the active adapter target

#### Scenario: Auto sync after remove

- **WHEN** auto sync is enabled and the user runs `askill remove git-master`
- **THEN** the CLI removes the skill locally
- **AND** synchronizes the remaining installed skills to the active adapter target

### Requirement: Expose Auto Sync Configuration

The system SHALL expose the auto sync workspace setting in local state and status output.

#### Scenario: Status displays auto sync

- **WHEN** the user runs `askill status`
- **THEN** the CLI shows whether auto sync is enabled or disabled for the workspace

### Requirement: Synchronize Skills To Additional Agent Targets

The system SHALL synchronize installed skills into the official project instruction targets of additional major agent adapters.

#### Scenario: Sync to Claude Code

- **WHEN** the active adapter is `claude`
- **THEN** the CLI writes the managed skills block to `CLAUDE.md`

#### Scenario: Sync to Gemini CLI

- **WHEN** the active adapter is `gemini`
- **THEN** the CLI writes the managed skills block to `GEMINI.md`

#### Scenario: Sync to Windsurf

- **WHEN** the active adapter is `windsurf`
- **THEN** the CLI writes a generated rules file to `.windsurf/rules/askill-skills.md`

### Requirement: Preserve Manual Content In Additional Shared Files

The system SHALL preserve user-authored content in shared instruction files for newly supported adapters while updating the managed skills content.

#### Scenario: Sync into existing CLAUDE.md

- **WHEN** the workspace already contains manual content in `CLAUDE.md`
- **THEN** the CLI updates only its managed block
- **AND** leaves unrelated user content unchanged

#### Scenario: Sync into existing GEMINI.md

- **WHEN** the workspace already contains manual content in `GEMINI.md`
- **THEN** the CLI updates only its managed block
- **AND** leaves unrelated user content unchanged

