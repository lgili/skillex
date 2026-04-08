# skill-management-cli Specification

## Purpose
TBD - created by archiving change add-cli-management-and-adapters. Update Purpose after archive.
## Requirements
### Requirement: Search Remote Skills

The system SHALL provide a CLI command named `skillex` that can search skills from all configured sources using text and optional filters, or from a single source when `--repo` is provided.

#### Scenario: Search across configured sources

- **WHEN** the user runs `skillex search git`
- **THEN** the CLI searches every source configured in `.agent-skills/skills.json`
- **AND** returns matching skills with enough source context to identify where each result came from

#### Scenario: Search a single override source

- **WHEN** the user runs `skillex search pdf --compatibility codex --repo owner/repo`
- **THEN** the CLI searches only `owner/repo`
- **AND** returns only matching skills compatible with `codex`

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

### Requirement: Manage Configured Catalog Sources

The system SHALL provide `skillex source add`, `skillex source remove`, and `skillex source list` commands to manage the workspace source list.

#### Scenario: Add a new source

- **WHEN** the user runs `skillex source add myorg/my-skills`
- **THEN** the CLI appends `myorg/my-skills` to the workspace source list
- **AND** preserves any existing configured sources

#### Scenario: Add a labeled source

- **WHEN** the user runs `skillex source add myorg/my-skills --label work`
- **THEN** the CLI stores `work` as the label for that source
- **AND** `skillex source list` displays the label with the source entry

#### Scenario: Remove an existing source

- **WHEN** the user runs `skillex source remove myorg/my-skills`
- **THEN** the CLI removes that source from the workspace source list
- **AND** leaves the remaining configured sources unchanged

### Requirement: List Skills Across Configured Sources

The system SHALL list remote skills from every configured source by default and group the output by source.

#### Scenario: List aggregated sources in human-readable output

- **WHEN** the user runs `skillex list`
- **THEN** the CLI shows skills grouped under each configured source
- **AND** the grouping identifies the source repo and ref for each section

#### Scenario: List a single source with override

- **WHEN** the user runs `skillex list --repo owner/repo`
- **THEN** the CLI shows only the skills from `owner/repo` for that command

### Requirement: Install Skills From Any Configured Source

The system SHALL resolve `skillex install <skill-id>` against all configured sources when no `--repo` override is provided.

#### Scenario: Install a skill found in exactly one configured source

- **WHEN** the user runs `skillex install code-review`
- **AND** only one configured source contains `code-review`
- **THEN** the CLI installs that skill successfully
- **AND** records the originating source in the installed skill metadata

#### Scenario: Reject ambiguous install across multiple sources

- **WHEN** the user runs `skillex install code-review`
- **AND** more than one configured source contains `code-review`
- **THEN** the CLI fails with an ambiguity error
- **AND** instructs the user to disambiguate by choosing a specific source, such as with `--repo`

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

