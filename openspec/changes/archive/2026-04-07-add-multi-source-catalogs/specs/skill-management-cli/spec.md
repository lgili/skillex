## MODIFIED Requirements

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

## ADDED Requirements

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