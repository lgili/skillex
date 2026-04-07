## ADDED Requirements

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
