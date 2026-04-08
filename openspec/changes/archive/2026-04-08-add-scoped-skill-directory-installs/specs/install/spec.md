## ADDED Requirements
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
