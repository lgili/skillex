## ADDED Requirements

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

## MODIFIED Requirements

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
