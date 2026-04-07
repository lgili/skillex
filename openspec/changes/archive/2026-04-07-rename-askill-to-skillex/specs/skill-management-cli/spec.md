## MODIFIED Requirements

### Requirement: Search Remote Skills

The system SHALL provide a CLI command named `skillex` that can search skills from a remote catalog using text and optional filters.

#### Scenario: Search by text

- **WHEN** the user runs `skillex search git --repo owner/repo`
- **THEN** the CLI returns matching skills ordered consistently

#### Scenario: Search by compatibility

- **WHEN** the user runs `skillex search pdf --compatibility codex --repo owner/repo`
- **THEN** the CLI returns only matching skills compatible with `codex`

### Requirement: Remove Installed Skills

The system SHALL provide a command named `skillex` that removes one or more installed skills from the local workspace state.

#### Scenario: Remove one installed skill

- **WHEN** the user runs `skillex remove skill-creator`
- **THEN** the CLI removes the skill folder from `.agent-skills/`
- **AND** removes the skill entry from `.agent-skills/skills.json`

#### Scenario: Remove a skill that is not installed

- **WHEN** the user runs `skillex remove missing-skill`
- **THEN** the CLI reports that the skill is not installed
- **AND** leaves the workspace state unchanged

### Requirement: Update Installed Skills

The system SHALL provide a command named `skillex` that refreshes installed skills from the configured remote catalog.

#### Scenario: Update all installed skills

- **WHEN** the user runs `skillex update`
- **THEN** the CLI checks the configured remote catalog
- **AND** downloads newer versions for installed skills when available

#### Scenario: Update only selected skills

- **WHEN** the user runs `skillex update skill-creator`
- **THEN** the CLI updates only the selected installed skill

### Requirement: Detect And Persist Agent Adapter

The system SHALL detect likely agent adapters from the workspace and persist the selected adapter in the local state.

#### Scenario: Detect a known adapter during init

- **WHEN** the user runs `skillex init` in a workspace containing a known agent marker
- **THEN** the CLI detects the matching adapter
- **AND** stores the adapter identifier in `.agent-skills/skills.json`

#### Scenario: Override detected adapter

- **WHEN** the user runs `skillex init --adapter codex`
- **THEN** the CLI stores `codex` as the active adapter even if another adapter was detected

### Requirement: Detect Additional Major Agent Adapters

The system SHALL detect additional major agent adapters used in the local workspace and allow them to be selected as the active adapter.

#### Scenario: Detect Claude Code markers

- **WHEN** the workspace contains `CLAUDE.md` or `.claude/`
- **THEN** `skillex init` detects the `claude` adapter

#### Scenario: Detect Gemini CLI markers

- **WHEN** the workspace contains `GEMINI.md` or `.gemini/`
- **THEN** `skillex init` detects the `gemini` adapter

#### Scenario: Detect Windsurf markers

- **WHEN** the workspace contains `.windsurf/` or `.windsurf/rules/`
- **THEN** `skillex init` detects the `windsurf` adapter

### Requirement: Prefer Specific Markers Over Shared Markers

The system SHALL prioritize more specific adapter markers over shared files when choosing the active detected adapter.

#### Scenario: Prefer Windsurf over shared AGENTS marker

- **WHEN** the workspace contains both `AGENTS.md` and `.windsurf/rules/`
- **THEN** `skillex init` keeps `windsurf` ahead of `codex` in detected adapter priority

### Requirement: Accept Compatibility Aliases

The system SHALL normalize common compatibility aliases to canonical adapter identifiers during skill search filtering.

#### Scenario: Search using Claude alias

- **WHEN** the user runs `skillex search review --compatibility claude-code --repo owner/repo`
- **THEN** the CLI treats `claude-code` as `claude`

#### Scenario: Search using Gemini alias

- **WHEN** the user runs `skillex search docs --compatibility gemini-cli --repo owner/repo`
- **THEN** the CLI treats `gemini-cli` as `gemini`
