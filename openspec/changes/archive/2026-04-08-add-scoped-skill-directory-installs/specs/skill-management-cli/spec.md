## ADDED Requirements
### Requirement: Select Install Scope From The CLI

The `skillex` CLI SHALL let the user choose whether a command operates on workspace-local state or user-global state.

#### Scenario: Default commands target local scope

- **WHEN** the user runs `skillex status`
- **THEN** the command reads `.agent-skills/skills.json`
- **AND** reports the local workspace state by default

#### Scenario: Global alias selects global scope

- **WHEN** the user runs `skillex status --global`
- **THEN** the command reads `~/.skillex/skills.json`
- **AND** reports the global state instead of the workspace state

#### Scenario: Explicit scope flag selects global scope

- **WHEN** the user runs `skillex update --scope global`
- **THEN** the command updates skills recorded in `~/.skillex/skills.json`
- **AND** leaves the workspace install state unchanged

### Requirement: Global Sync Requires A Global Adapter Context

The CLI SHALL require a known global adapter when synchronizing global installs.

#### Scenario: Global sync uses stored global adapter

- **WHEN** the user has already run `skillex init --global --adapter claude`
- **AND** runs `skillex sync --global`
- **THEN** Skillex synchronizes the global install state to the `claude` adapter targets under the user's home directory

#### Scenario: Global sync errors without adapter context

- **WHEN** no global adapter has been configured
- **AND** the user runs `skillex sync --global`
- **THEN** the command fails with a clear error explaining that the user must run `skillex init --global --adapter <id>` or pass `--adapter`
