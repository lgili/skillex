## ADDED Requirements

### Requirement: Display Repository Status In README

The system SHALL expose repository status badges in the README for CI and npm package publishing.

#### Scenario: README shows CI badge

- **WHEN** a user opens the repository README
- **THEN** the README displays a badge for the CI workflow

#### Scenario: README shows npm badge

- **WHEN** a user opens the repository README
- **THEN** the README displays a badge for the npm package version

### Requirement: Create GitHub Releases From Version Tags

The system SHALL create a GitHub Release with automatic notes when a version tag is pushed.

#### Scenario: Release is created from version tag

- **WHEN** a tag such as `v0.1.0` is pushed
- **THEN** the release workflow creates a GitHub Release for that tag
- **AND** the release contains automatically generated notes
