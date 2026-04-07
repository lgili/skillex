## MODIFIED Requirements

### Requirement: Publish Scoped NPM Package

The system SHALL publish the CLI as the unscoped package `skillex`.

#### Scenario: Package metadata uses unscoped name

- **WHEN** the package metadata is prepared for release
- **THEN** the package name is `skillex`
- **AND** the install documentation references the package name `skillex`

### Requirement: Configure Repository Remote

The system SHALL target the GitHub repository `https://github.com/lgili/skillex.git`.

#### Scenario: Remote points to target repository

- **WHEN** the maintainer inspects the configured git remote
- **THEN** the repository remote is `https://github.com/lgili/skillex.git`
