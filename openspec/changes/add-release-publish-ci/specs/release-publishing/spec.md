## ADDED Requirements

### Requirement: Publish Scoped NPM Package

The system SHALL publish the CLI as the scoped package `@lgili/askill`.

#### Scenario: Package metadata uses scoped name

- **WHEN** the package metadata is prepared for release
- **THEN** the package name is `@lgili/askill`
- **AND** the install documentation references the scoped package name

### Requirement: Validate Package In Continuous Integration

The system SHALL run automated validation for the package in GitHub Actions.

#### Scenario: CI runs on push

- **WHEN** code is pushed to the repository
- **THEN** GitHub Actions runs the test workflow

#### Scenario: CI runs on pull request

- **WHEN** a pull request is opened or updated
- **THEN** GitHub Actions runs the test workflow

### Requirement: Publish On Version Tags

The system SHALL publish the npm package when a version tag is pushed.

#### Scenario: Publish on semantic version tag

- **WHEN** a tag such as `v0.1.0` is pushed
- **THEN** GitHub Actions publishes the package to npm using the configured secret

### Requirement: Configure Repository Remote

The system SHALL target the GitHub repository `https://github.com/lgili/askill.git`.

#### Scenario: Remote points to target repository

- **WHEN** the maintainer inspects the configured git remote
- **THEN** the repository remote is `https://github.com/lgili/askill.git`
