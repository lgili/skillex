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

### Requirement: Web UI Doctor Panel

The Web UI MUST expose a `Doctor` route that calls a `/api/doctor` JSON endpoint and renders the same six checks as the CLI `doctor` command (lockfile, source, adapter, GitHub reachability, token status, cache freshness). Each check MUST display the status icon, the label, and the actionable hint.

#### Scenario: Doctor panel mirrors CLI output

- **WHEN** a user opens `Doctor` in the Web UI
- **THEN** the panel lists exactly the same six checks as `skillex doctor`
- **AND** each check shows status (pass / warn / fail) and the same hint text

#### Scenario: Aggregate health is reflected in the sidebar

- **WHEN** at least one check fails
- **THEN** the sidebar shows a red status dot next to the Doctor link

#### Scenario: All checks pass

- **WHEN** every check returns pass
- **THEN** the sidebar shows a green status dot next to the Doctor link

### Requirement: Mobile Navigation Drawer

The Web UI MUST provide an accessible navigation experience at viewport widths ≤ 680 px. Hiding the sidebar with no alternative navigation is prohibited.

#### Scenario: Hamburger opens drawer on small screens

- **WHEN** the viewport width is ≤ 680 px and the user taps the hamburger button in the top bar
- **THEN** a drawer slides in containing the sidebar navigation, sources list, and adapter chips
- **AND** focus moves into the drawer

#### Scenario: Esc closes the drawer

- **WHEN** the drawer is open and the user presses Escape
- **THEN** the drawer closes
- **AND** focus returns to the hamburger button

### Requirement: Dynamic Version Display

The Web UI MUST display the current package version sourced from `package.json` at build time. Hardcoded version literals are prohibited.

#### Scenario: Version matches package.json

- **WHEN** the Web UI renders its version badge
- **THEN** the displayed string equals the value of `package.json#version` at the time of `npm run build:ui`

#### Scenario: Build-time injection

- **WHEN** `vite.config.ts` builds the bundle
- **THEN** the version is injected via `import.meta.env.VITE_SKILLEX_VERSION`
- **AND** any literal `v0.X.Y` string in the bundle is treated as a regression by the test suite

### Requirement: Cmd+K Search Shortcut

The Web UI MUST either implement the keyboard shortcut advertised in the header (`Cmd+K` on Mac, `Ctrl+K` elsewhere) or remove the hint badge. Dead UI affordances are prohibited.

#### Scenario: Shortcut focuses search

- **WHEN** the search input is reachable on the current route and the user presses Cmd+K (or Ctrl+K)
- **THEN** the search input receives focus

#### Scenario: Hint badge is conditional

- **WHEN** the current route does not include a search input
- **THEN** the hint badge is hidden

### Requirement: No Unverifiable Trust Badge

The Web UI MUST NOT display an "Official" or "Verified" badge on a skill card unless a verification model is in place that distinguishes verified from unverified publishers. The current unconditional `Oficial` badge MUST be removed.

#### Scenario: Catalog skill renders without misleading badge

- **WHEN** any skill is rendered in the catalog grid
- **THEN** no `Official` / `Verified` / `Oficial` badge is shown

### Requirement: Self-Contained Skill Avatar

The Web UI MUST render skill author avatars without making external HTTP requests. The avatar MUST be a deterministic CSS-only rendering (initials on a hashed background) so the UI works offline and does not leak page-load telemetry to third-party services.

#### Scenario: Avatar renders offline

- **WHEN** the network has no access to `dicebear.com` or other third parties
- **THEN** every skill card still displays a recognizable avatar
- **AND** no `<img>` request to a third-party host is issued

### Requirement: Per-Card Action Loading State

Card-level actions (install, remove, update) MUST surface their loading state inside the originating card, not behind a global blocking overlay. The rest of the page MUST remain interactive while a single card is busy.

#### Scenario: Installing a single skill keeps the page interactive

- **WHEN** the user clicks Install on one card
- **THEN** that card shows a localized spinner and a dimmed action button
- **AND** other cards remain clickable
- **AND** the global busy overlay is not shown

#### Scenario: Bulk action still uses global overlay

- **WHEN** a bulk action (such as install-all or sync) is triggered
- **THEN** the global overlay is shown for the duration of the action

### Requirement: First-Load Skeleton

The Web UI MUST render a skeleton placeholder while the initial `refreshAll()` call is in flight, so the user never sees a blank page.

#### Scenario: First page load shows skeleton

- **WHEN** the user opens the Web UI for the first time and `refreshAll()` is still pending
- **THEN** a skeleton grid (rows of placeholder cards) is rendered
- **AND** the skeleton is replaced by real cards once `refreshAll()` resolves

### Requirement: Optional Skill Category Metadata

A `SkillManifest` MAY declare an explicit `category` field. The Web UI catalog page MUST prefer the explicit category when present; if absent, the existing regex inference is used and a small `(inferred)` chip is displayed next to the category badge so contributors can see when their metadata is incomplete.

#### Scenario: Explicit category wins

- **WHEN** a skill manifest declares `category: "code"`
- **THEN** the catalog page groups it under `Code` without the inferred chip

#### Scenario: Inferred category shows chip

- **WHEN** no `category` is declared and the regex inference assigns a category
- **THEN** the catalog page renders the inferred category badge with a small `(inferred)` chip

