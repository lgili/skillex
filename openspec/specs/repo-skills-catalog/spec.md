# repo-skills-catalog Specification

## Purpose
TBD - created by archiving change add-first-party-skills-catalog. Update Purpose after archive.
## Requirements
### Requirement: Publish First-Party Skills In This Repository

The repository SHALL expose first-party skills in a catalog structure consumable by the `askill` CLI.

#### Scenario: Catalog file lists first-party skills

- **WHEN** a user or CLI reads the repository root
- **THEN** a `catalog.json` file exists
- **AND** it lists the first-party skills published by the repository

#### Scenario: First-party skill files exist in skills directory

- **WHEN** a maintainer inspects a listed skill
- **THEN** the skill exists under `skills/<skill-id>/`
- **AND** contains the files declared in `catalog.json`

### Requirement: Provide A Skill For Authoring New Skills

The repository SHALL include a first-party skill dedicated to creating new repository skills in the correct format.

#### Scenario: Create-skills skill is published

- **WHEN** a maintainer inspects the catalog
- **THEN** a skill with id `create-skills` is present

#### Scenario: Create-skills skill scaffolds a new skill

- **WHEN** the skill is used to create a new skill for this repository
- **THEN** it creates the expected folder structure and metadata files
- **AND** guides the maintainer to update the local catalog entry

### Requirement: Document Repository Skill Authoring

The repository SHALL document how first-party skills are added and maintained.

#### Scenario: README documents first-party skills

- **WHEN** a maintainer reads the README
- **THEN** the README explains where skills live
- **AND** how the first-party catalog is updated

### Requirement: Scaffold New Skills With Current Adapter Defaults

The repository skill scaffold SHALL default new skills to the current set of supported adapter identifiers unless the maintainer overrides compatibility explicitly.

#### Scenario: Create skill without compatibility override

- **WHEN** a maintainer runs the `create-skills` scaffold without `--compatibility`
- **THEN** the generated `skill.json` includes the current supported adapter ids
- **AND** the same compatibility list is written to `catalog.json`

