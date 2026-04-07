## MODIFIED Requirements

### Requirement: Publish First-Party Skills In This Repository

The repository SHALL expose first-party skills in a catalog structure consumable by the `skillex` CLI.

#### Scenario: Catalog file lists first-party skills

- **WHEN** a user or CLI reads the repository root
- **THEN** a `catalog.json` file exists
- **AND** it lists the first-party skills published by the repository

#### Scenario: First-party skill files exist in skills directory

- **WHEN** a maintainer inspects a listed skill
- **THEN** the skill exists under `skills/<skill-id>/`
- **AND** contains the files declared in `catalog.json`
