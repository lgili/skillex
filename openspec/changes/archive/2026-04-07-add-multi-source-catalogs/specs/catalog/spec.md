## ADDED Requirements

### Requirement: Aggregate Skills Across Configured Sources

The system SHALL load and aggregate skills from every configured source in the current workspace when a command does not provide a `--repo` override.

#### Scenario: Aggregate skills from multiple sources

- **WHEN** the workspace lockfile contains more than one configured source
- **THEN** the catalog layer returns skills from every configured source
- **AND** preserves a stable source association for each returned skill

#### Scenario: Single-source override bypasses aggregation

- **WHEN** a command provides `--repo owner/repo`
- **THEN** the catalog layer loads only that source for the current operation
- **AND** does not require the override source to be persisted in the workspace lockfile

### Requirement: Preserve Source Identity For Duplicate Skill IDs

The system SHALL preserve source identity when multiple configured sources expose the same skill id.

#### Scenario: Duplicate ids remain distinguishable during aggregation

- **WHEN** two configured sources both publish a skill with id `code-review`
- **THEN** the aggregated catalog result includes both entries
- **AND** each entry retains its originating source metadata