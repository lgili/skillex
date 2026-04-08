## MODIFIED Requirements
### Requirement: Local Web UI
The CLI SHALL provide a local Web UI launched by `skillex ui` for browsing and
managing skills in a browser.

#### Scenario: UI command launches a bundled frontend app
- **WHEN** the user runs `skillex ui`
- **THEN** Skillex starts a local server bound to loopback
- **AND** serves a bundled frontend application from local static assets
- **AND** opens the browser to that local UI

#### Scenario: Web UI remains fully local
- **WHEN** the user opens `skillex ui`
- **THEN** all frontend assets and API calls are served locally from the user's machine
- **AND** no hosted Skillex dashboard is required

### Requirement: Web UI Catalog Presentation
The local Web UI SHALL present the aggregated skill catalog in a visual format
that improves discovery and inspection before installation.

#### Scenario: Catalog page is a dedicated frontend route
- **WHEN** the Web UI loads at `/`
- **THEN** the user sees the catalog experience as a dedicated page
- **AND** catalog browsing is not rendered as an inline terminal-style shell

### Requirement: Web UI Skill Detail Navigation
The local Web UI SHALL provide a dedicated page for skill inspection instead of
embedding the entire detail view under the catalog listing.

#### Scenario: Opening a skill navigates to a dedicated detail route
- **WHEN** the user opens a skill from the catalog
- **THEN** the UI navigates to a dedicated detail route for that skill
- **AND** the detail view occupies the main page experience

#### Scenario: Detail route is served by the local frontend app
- **WHEN** the user opens `/skills/<skill-id>`
- **THEN** the local frontend app is served successfully
- **AND** the skill detail content is resolved from the local API
