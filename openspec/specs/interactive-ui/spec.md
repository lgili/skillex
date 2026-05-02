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

The Web UI MUST focus the topbar search input when the user presses `Cmd+K` (Mac) or `Ctrl+K` (other platforms). If the search input is not on the current route, the shortcut MUST navigate to the catalog first and then focus the input on the next tick. The hint badge in the topbar MUST display `⌘K` on Mac and `Ctrl K` elsewhere now that the shortcut is wired.

#### Scenario: Shortcut focuses search on the catalog page

- **WHEN** the user is on `/` and presses `Cmd+K` (Mac) or `Ctrl+K` (other)
- **THEN** the topbar search input receives focus
- **AND** the input contents are selected so the user can immediately type

#### Scenario: Shortcut from another route navigates first

- **WHEN** the user is on `/skills/<id>` or `/doctor` and presses the shortcut
- **THEN** the router navigates back to `/`
- **AND** the topbar search input receives focus once the route resolves

#### Scenario: Hint label adapts to platform

- **WHEN** the user opens the Web UI on macOS
- **THEN** the topbar search hint reads `⌘K`

- **WHEN** the user opens the Web UI on Linux or Windows
- **THEN** the topbar search hint reads `Ctrl K`

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

Card-level actions (install, remove, update on a single skill) MUST surface their loading state inside the originating card, not behind a global blocking overlay. The rest of the page MUST remain interactive while a single card is busy. The store MUST track in-flight cards via a reactive `state.busyCards: Set<string>` and expose a dedicated `runCardAction(skillId, label, fn)` helper distinct from the workspace-wide `runGlobalAction` used for refresh / sync / source mutations.

#### Scenario: Installing a single skill keeps the page interactive

- **WHEN** the user clicks Install on one card
- **THEN** that card shows a localized spinner inside its action button
- **AND** the action button is disabled while the request is in flight
- **AND** other cards remain clickable
- **AND** the global busy overlay is not shown

#### Scenario: Bulk action still uses global overlay

- **WHEN** a bulk action (such as install-all, sync now, update all, source add/remove) is triggered
- **THEN** the global overlay is shown for the duration of the action
- **AND** the action goes through `runGlobalAction`, not `runCardAction`

### Requirement: First-Load Skeleton

The Web UI MUST render skeleton placeholders during the initial fetch on data-bound pages so users never see a blank panel while `refreshAll()` or page-specific loads resolve. Skeletons MUST be rendered using the shared `Skeleton.vue` component (variants `card` and `row`) so the visual treatment stays consistent.

#### Scenario: Catalog skeleton on first load

- **WHEN** the catalog page mounts and `state.catalog` is still `null`
- **THEN** a 6-card skeleton grid is rendered using the `card` variant
- **AND** the skeleton is replaced by real cards once the catalog resolves

#### Scenario: Doctor skeleton on first load

- **WHEN** the Doctor page mounts and the report has not resolved yet
- **THEN** a 4-row skeleton list is rendered using the `row` variant
- **AND** the skeleton is replaced by the real check rows once the report resolves

### Requirement: Optional Skill Category Metadata

A `SkillManifest` MAY declare an explicit `category` field, sourced either from `skill.json` or from `SKILL.md` frontmatter. The Web UI catalog page MUST prefer the explicit category when present; if absent, the existing regex inference is used and the rendered card MUST display a small `(inferred)` chip so contributors can see when their metadata is incomplete.

#### Scenario: Explicit category wins

- **WHEN** a skill manifest declares `category: "code"`
- **THEN** the catalog page groups it under `Code`
- **AND** the card does NOT render an `(inferred)` chip

#### Scenario: Inferred category shows chip

- **WHEN** no `category` is declared and the regex inference assigns a category
- **THEN** the catalog page renders the inferred category badge
- **AND** the card renders a small `(inferred)` chip

### Requirement: Sidebar Health Dot

The Web UI sidebar Doctor entry MUST display an aggregate health dot reflecting the most recent `runDoctorChecks()` result so users can see workspace health without opening the Doctor panel.

#### Scenario: All checks pass

- **WHEN** the latest doctor report has `hasFailures: false` and no `warn` checks
- **THEN** the sidebar Doctor link shows a green dot

#### Scenario: At least one warning, no failures

- **WHEN** the latest doctor report has at least one `warn` check and no `fail` checks
- **THEN** the sidebar Doctor link shows a yellow dot

#### Scenario: Any failure

- **WHEN** the latest doctor report has at least one `fail` check
- **THEN** the sidebar Doctor link shows a red dot

#### Scenario: Refreshed after destructive actions

- **WHEN** the user runs install / remove / update / sync / source-add / source-remove
- **THEN** the doctor status is re-fetched after the action settles so the dot reflects the new state

### Requirement: Inferred Category Chip

The Web UI catalog page MUST visually annotate skills whose category was resolved via the regex fallback (rather than from an explicit manifest field) by rendering a small `(inferred)` chip on the card. This makes incomplete metadata visible to contributors at a glance.

#### Scenario: Inferred fallback is annotated

- **WHEN** a skill manifest does not declare `category` and the regex `inferCategory` heuristic assigns one
- **THEN** the rendered card shows a small `(inferred)` chip

#### Scenario: Explicit category does not show the chip

- **WHEN** a skill manifest declares `category: "code"`
- **THEN** the rendered card does NOT show the `(inferred)` chip

