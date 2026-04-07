## MODIFIED Requirements

### Requirement: Sync Installed Skills To Active Adapter

The system SHALL provide a command named `skillex` to synchronize installed skills into files consumed by the active adapter.

#### Scenario: Sync using active adapter

- **WHEN** the user runs `skillex sync`
- **THEN** the CLI synchronizes installed skills to the adapter stored as active in `.agent-skills/skills.json`

#### Scenario: Override adapter during sync

- **WHEN** the user runs `skillex sync --adapter cursor`
- **THEN** the CLI synchronizes installed skills to the `cursor` adapter targets
- **AND** does not require changing the stored active adapter

### Requirement: Generate Adapter-Specific Files

The system SHALL write synchronized skills to adapter-specific target files using the `skillex` namespace.

#### Scenario: Sync to Codex

- **WHEN** the active adapter is `codex`
- **THEN** the CLI writes the managed skills block to `AGENTS.md`

#### Scenario: Sync to Copilot

- **WHEN** the active adapter is `copilot`
- **THEN** the CLI writes the managed skills block to `.github/copilot-instructions.md`

#### Scenario: Sync to Cline

- **WHEN** the active adapter is `cline`
- **THEN** the CLI writes a generated rules file to `.clinerules/skillex-skills.md`

#### Scenario: Sync to Cursor

- **WHEN** the active adapter is `cursor`
- **THEN** the CLI writes a generated project rule to `.cursor/rules/skillex-skills.mdc`

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
