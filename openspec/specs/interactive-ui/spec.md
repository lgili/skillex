# interactive-ui Specification

## Purpose
TBD - created by archiving change add-symlink-run-ui-and-direct-install. Update Purpose after archive.
## Requirements
### Requirement: Interactive Terminal UI
The CLI SHALL provide a `ui` command that opens an interactive terminal flow displaying all available catalog skills, allowing the user to filter the catalog, toggle selections with the space bar, and install by pressing Enter.

#### Scenario: UI displays catalog skills
- **WHEN** `skillex ui` is executed
- **THEN** an interactive checklist of all catalog skills is rendered in the terminal
- **AND** each entry shows the skill name, description, and compatibility tags

#### Scenario: User selects and installs skills
- **WHEN** the user toggles one or more skills and presses Enter to confirm
- **THEN** the selected skills are installed via the standard `installSkills()` flow
- **AND** a success summary is printed after installation

#### Scenario: Empty catalog shows friendly message
- **WHEN** `skillex ui` is executed and the catalog returns no skills
- **THEN** a message is printed stating no skills are available and exits with code 0

### Requirement: Search Filter
The interactive UI SHALL support a text input field that filters the visible skill list before selection, matching skill names and descriptions case-insensitively.

#### Scenario: Entering a filter narrows the skill list
- **WHEN** the user enters `"git"` in the search field
- **THEN** only skills whose name or description contains `"git"` (case-insensitive) are shown

#### Scenario: Clearing search restores full list
- **WHEN** the user deletes all text from the search field
- **THEN** all catalog skills are shown again

### Requirement: Pre-Selected Installed Skills
The interactive UI SHALL pre-check skills that are already installed in the current project so the user can see current installation state at a glance.

#### Scenario: Installed skills appear pre-checked
- **WHEN** `skillex ui` is opened and `git-master` is already installed
- **THEN** the `git-master` entry in the checklist appears pre-selected

#### Scenario: Deselecting an installed skill removes it
- **WHEN** the user unchecks an already-installed skill and confirms
- **THEN** `removeSkills()` is called for that skill and a removal summary is printed

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

