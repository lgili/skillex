## ADDED Requirements

### Requirement: English Terminal UI Labels

The interactive terminal UI (`skillex` with no subcommand, `skillex browse`, `skillex tui`) MUST render every prompt label, instruction line, status banner, and error message in English.

#### Scenario: Prompt label is in English

- **WHEN** the TUI launches
- **THEN** the search-filter prompt label and the `instructions` footer are in English

#### Scenario: Empty catalog message is in English

- **WHEN** the catalog is empty
- **THEN** the displayed empty-state message is in English

### Requirement: English Web UI Strings

The Web UI delivered by `skillex ui` MUST display every visible string in English. This includes navigation labels, header status indicators, search placeholders, button labels, category labels, empty-state messages, toast notifications, and the loading overlay text.

#### Scenario: Navigation and header are in English

- **WHEN** a user opens the Web UI
- **THEN** sidebar items (Catalog, Installed, Workspace), header status (Active agent, Refresh), and search placeholder are in English

#### Scenario: Skill card actions are in English

- **WHEN** a skill card is rendered
- **THEN** the install / installed / update / remove button labels are in English

#### Scenario: Category labels are in English

- **WHEN** the catalog page groups skills by category
- **THEN** every category heading and the `Other` fallback are in English
