# skill-management-cli Specification

## Purpose
TBD - created by archiving change add-cli-management-and-adapters. Update Purpose after archive.
## Requirements
### Requirement: Search Remote Skills

The system SHALL provide a command to search the remote catalog using textual filters and optional compatibility filters.

#### Scenario: Search by free text

- **WHEN** the user runs `askill search git --repo owner/repo`
- **THEN** the CLI returns only skills whose id, name, description, or tags match `git`

#### Scenario: Search by compatibility

- **WHEN** the user runs `askill search pdf --compatibility codex --repo owner/repo`
- **THEN** the CLI returns only matching skills compatible with `codex`

### Requirement: Remove Installed Skills

The system SHALL remove installed skills from the managed local directory and local lockfile.

#### Scenario: Remove one installed skill

- **WHEN** the user runs `askill remove skill-creator`
- **THEN** the CLI deletes `.agent-skills/skill-creator`
- **AND** removes `skill-creator` from `.agent-skills/skills.json`

#### Scenario: Remove unknown skill

- **WHEN** the user runs `askill remove missing-skill`
- **THEN** the CLI reports that the skill is not installed
- **AND** does not modify other installed skills

### Requirement: Update Installed Skills

The system SHALL refresh installed skills from the configured remote catalog.

#### Scenario: Update all installed skills

- **WHEN** the user runs `askill update`
- **THEN** the CLI reloads the configured catalog
- **AND** reinstalls each skill recorded in `.agent-skills/skills.json`
- **AND** updates each installed skill version in the lockfile

#### Scenario: Update one installed skill

- **WHEN** the user runs `askill update skill-creator`
- **THEN** the CLI updates only `skill-creator`
- **AND** leaves all other installed skills unchanged

### Requirement: Detect And Persist Agent Adapter

The system SHALL detect likely agent adapters from the workspace and persist the selected adapter in the local state.

#### Scenario: Detect a known adapter during init

- **WHEN** the user runs `askill init` in a workspace containing a known agent marker
- **THEN** the CLI detects the matching adapter
- **AND** stores the adapter identifier in `.agent-skills/skills.json`

#### Scenario: Override detected adapter

- **WHEN** the user runs `askill init --adapter codex`
- **THEN** the CLI stores `codex` as the active adapter even if another adapter was detected

### Requirement: Detect Additional Major Agent Adapters

The system SHALL detect additional major agent adapters used in the local workspace and allow them to be selected as the active adapter.

#### Scenario: Detect Claude Code markers

- **WHEN** the workspace contains `CLAUDE.md` or `.claude/`
- **THEN** `askill init` detects the `claude` adapter

#### Scenario: Detect Gemini CLI markers

- **WHEN** the workspace contains `GEMINI.md` or `.gemini/`
- **THEN** `askill init` detects the `gemini` adapter

#### Scenario: Detect Windsurf markers

- **WHEN** the workspace contains `.windsurf/` or `.windsurf/rules/`
- **THEN** `askill init` detects the `windsurf` adapter

### Requirement: Prefer Specific Markers Over Shared Markers

The system SHALL prioritize more specific adapter markers over shared files when choosing the active detected adapter.

#### Scenario: Prefer Windsurf over shared AGENTS marker

- **WHEN** the workspace contains both `AGENTS.md` and `.windsurf/rules/`
- **THEN** `askill init` keeps `windsurf` ahead of `codex` in detected adapter priority

### Requirement: Accept Compatibility Aliases

The system SHALL normalize common compatibility aliases to canonical adapter identifiers during skill search filtering.

#### Scenario: Search using Claude alias

- **WHEN** the user runs `askill search review --compatibility claude-code --repo owner/repo`
- **THEN** the CLI treats `claude-code` as `claude`

#### Scenario: Search using Gemini alias

- **WHEN** the user runs `askill search docs --compatibility gemini-cli --repo owner/repo`
- **THEN** the CLI treats `gemini-cli` as `gemini`

