# adapter-sync Specification

## Purpose
TBD - created by archiving change add-adapter-sync. Update Purpose after archive.
## Requirements
### Requirement: Sync Installed Skills To Active Adapter

The system SHALL provide a command named `skillex` to synchronize installed skills into files consumed by the active adapter.

#### Scenario: Sync using active adapter

- **WHEN** the user runs `skillex sync`
- **THEN** the CLI synchronizes installed skills to the adapter stored as active in `.agent-skills/skills.json`

#### Scenario: Override adapter during sync

- **WHEN** the user runs `skillex sync --adapter cursor`
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

The system SHALL materialize installed skills into the native targets expected by each adapter.

#### Scenario: Sync to Codex workspace skill directory

- **WHEN** the active adapter is `codex`
- **AND** the selected scope is `local`
- **THEN** the CLI creates `.codex/skills/<skill-id>/` for each installed skill
- **AND** each materialized skill directory contains the installed skill contents, including `SKILL.md`

#### Scenario: Sync to Codex global skill directory

- **WHEN** the active adapter is `codex`
- **AND** the selected scope is `global`
- **THEN** the CLI creates `~/.codex/skills/<skill-id>/` for each installed global skill

#### Scenario: Sync to Claude workspace skill directory

- **WHEN** the active adapter is `claude`
- **AND** the selected scope is `local`
- **THEN** the CLI creates `.claude/skills/<skill-id>/` for each installed skill

#### Scenario: Sync to Gemini workspace skill directory

- **WHEN** the active adapter is `gemini`
- **AND** the selected scope is `local`
- **THEN** the CLI creates `.gemini/skills/<skill-id>/` for each installed skill

#### Scenario: File-based adapters keep their current sync targets

- **WHEN** the active adapter is `copilot`
- **THEN** the CLI continues to update `.github/copilot-instructions.md`

### Requirement: Persist Sync Metadata

The system SHALL record synchronization metadata in the local lockfile.

#### Scenario: Sync updates metadata

- **WHEN** the user runs `skillex sync`
- **THEN** the CLI records the synchronized adapter, target path, and timestamp in `.agent-skills/skills.json`

### Requirement: Preview Sync Changes Before Writing

The system SHALL provide a dry-run mode for synchronization that previews file changes without writing them.

#### Scenario: Preview sync without writing files

- **WHEN** the user runs `skillex sync --dry-run`
- **THEN** the CLI shows the target adapter and target path
- **AND** prints a textual diff of the generated file content
- **AND** does not modify files or the lockfile

### Requirement: Support Workspace Auto Sync

The system SHALL support an optional workspace setting that triggers synchronization automatically after local skill mutations.

#### Scenario: Enable auto sync during init

- **WHEN** the user runs `skillex init --auto-sync`
- **THEN** the CLI stores the workspace preference to enable automatic synchronization

#### Scenario: Auto sync after install

- **WHEN** auto sync is enabled and the user runs `skillex install git-master`
- **THEN** the CLI updates local installation state
- **AND** synchronizes the installed skills to the active adapter target

#### Scenario: Auto sync after update

- **WHEN** auto sync is enabled and the user runs `skillex update`
- **THEN** the CLI updates local installation state
- **AND** synchronizes the installed skills to the active adapter target

#### Scenario: Auto sync after remove

- **WHEN** auto sync is enabled and the user runs `skillex remove git-master`
- **THEN** the CLI updates local installation state
- **AND** synchronizes the remaining installed skills to the active adapter target

### Requirement: Expose Auto Sync Configuration

The system SHALL expose the auto sync workspace setting in local state and status output.

#### Scenario: Status displays auto sync

- **WHEN** the user runs `skillex status`
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
- **THEN** the CLI writes a generated rules file to `.windsurf/rules/skillex-skills.md`

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

### Requirement: Remove Legacy Aggregate Skill Files For Directory-Native Adapters

Skillex SHALL remove obsolete aggregate skill files when syncing adapters that now use native skill directories.

#### Scenario: Remove legacy Codex aggregate file

- **WHEN** `.codex/skills/skillex-skills.md` exists from an older Skillex version
- **AND** the user runs `skillex sync --adapter codex`
- **THEN** the CLI removes `.codex/skills/skillex-skills.md`
- **AND** the synced skills remain available through `.codex/skills/<skill-id>/`

#### Scenario: Remove legacy Claude aggregate file

- **WHEN** `.claude/skills/skillex-skills.md` exists from an older Skillex version
- **AND** the user runs `skillex sync --adapter claude`
- **THEN** the CLI removes `.claude/skills/skillex-skills.md`

