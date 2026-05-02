## 1. Per-card optimistic UI

- [x] 1.1 In `ui/src/store.ts`, add `busyCards: Set<string>` to reactive state and a new `runCardAction(skillId, label, fn)` helper that adds/removes the id from `busyCards` instead of setting `state.busyLabel`.
- [x] 1.2 Rename the existing `runAction` to `runGlobalAction` (used by refresh / sync / source mutations) so the call sites are explicit about which loading affordance they trigger.
- [x] 1.3 Update `installSkill` / `removeSkill` / `updateSkill` (when a single skill id is targeted) in the store to use `runCardAction`. *(Single-id `updateSkill` uses `runCardAction`; `updateSkill()` with no id falls back to `runGlobalAction` since multiple cards would need to spin.)*
- [x] 1.4 Expose `state.busyCards` in the `SkillexStore` interface.
- [x] 1.5 In `SkillCard.vue`, disable the action button and render a small inline spinner when `store.state.busyCards.has(skill.id)`; dim the card slightly to communicate the in-flight state.

## 2. First-load skeleton

- [x] 2.1 Create `ui/src/components/Skeleton.vue` — a generic shimmer block used both as a card placeholder and as a row placeholder.
- [x] 2.2 In `CatalogPage.vue`, render a 6-card skeleton grid when `store.state.catalog === null`.
- [x] 2.3 In `DoctorPage.vue`, render a 4-row skeleton list during the initial load (before `report.value` resolves).

## 3. Optional skill category metadata

- [x] 3.1 Add `category?: string` to `SkillManifest` in `src/types.ts`.
- [x] 3.2 Extend `parseSkillFrontmatter` (`src/skill.ts`) and its `SkillFrontmatter` type to read `category`.
- [x] 3.3 In `src/catalog.ts` `normalizeSkill`, propagate `category` from the manifest. In the tree fallback path, use the parsed frontmatter value too.
- [x] 3.4 In `ui/src/pages/CatalogPage.vue`, prefer `skill.category` over the regex `inferCategory`. When fallback was used, render a small `(inferred)` chip next to the category badge. *(Inferred chip rendered inside the card via `inferred-category` prop; visible on every inferred card.)*
- [x] 3.5 Document the new optional field in `README.md` "Skill Format" section.

## 4. Sidebar health dot

- [x] 4.1 Add `doctorStatus: "pass" | "warn" | "fail" | null` to `SkillexStore` state.
- [x] 4.2 Add `loadDoctorStatus()` to the store: calls `/api/doctor`, sets `doctorStatus` to `"fail"` when `hasFailures`, `"warn"` when any check is `warn`, `"pass"` otherwise.
- [x] 4.3 Trigger `loadDoctorStatus()` from `initialize()` and after any destructive action (install / remove / update / sync / source mutation). *(Triggered from both `runGlobalAction` and `runCardAction`, so every mutation refreshes the status.)*
- [x] 4.4 In `App.vue`, render a small colored dot next to the Doctor sidebar link based on `state.doctorStatus`. *(Pass = green, warn = yellow, fail = red with pulse.)*

## 5. Cmd+K shortcut

- [x] 5.1 In `App.vue`, register a global keydown listener that fires on `(metaKey || ctrlKey) && key === "k"`.
- [x] 5.2 If the user is currently on the catalog page, focus the existing topbar search input.
- [x] 5.3 Otherwise, navigate to `/` and focus the search input on the next tick.
- [x] 5.4 Use a stable `id` (e.g. `id="topbar-search"`) on the search input so the focus call works without prop drilling.

## 6. Demo media placeholder

- [x] 6.1 Create `docs/media/` directory.
- [x] 6.2 Add `docs/media/README.md` with brief recording instructions (asciinema for TUI, native screenshot for Web UI) and the expected file names.
- [x] 6.3 Add a "Demo" section to the main `README.md` that links to `docs/media/tui.gif` and `docs/media/web-ui.png` via raw GitHub URLs (so the npm tarball stays small).
- [x] 6.4 Confirm `docs/` is excluded from the npm package via `.npmignore` or `package.json#files` (already lists only `bin`, `dist`, `dist-ui`, `README.md`, `CHANGELOG.md`, so no change needed).

## 7. Validation

- [x] 7.1 `npm run typecheck` passes.
- [x] 7.2 `npm test` passes (no regressions; new `category` parsing assertion added to `test/catalog.test.ts`).
- [x] 7.3 `openspec validate complete-deferred-ui-polish --strict` passes.
- [x] 7.4 CHANGELOG `[Unreleased]` entry summarizes the polish landed.
