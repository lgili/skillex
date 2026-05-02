## Why

Six follow-up items were tracked as deferred in earlier OpenSpec changes:

- **Per-card optimistic UI** — install/remove/update on a single card still
  triggers the global `state.busyLabel` overlay, freezing the whole page
  for 2-5 seconds.
- **First-load skeleton** — the catalog page shows a blank area for ~1 s
  while the initial `refreshAll()` resolves.
- **Optional skill `category` metadata** — categories are inferred via a
  hand-tuned regex that matches the current 32 first-party skills. Any
  third-party skill silently lands under "Other".
- **Sidebar health dot** — Doctor sidebar entry has no aggregate status
  indicator, so users have to open the panel to know if anything is
  wrong.
- **Cmd+K shortcut** — already removed the dead hint badge; users still
  benefit from a real keybinding to focus the search input.
- **Demo media** — README has no GIF / screenshot for the strongest
  surfaces (TUI and Web UI).

These are coherent enough to ship together: all touch the Web UI polish
layer plus a small additive type change in the install/catalog modules.

## What Changes

- `SkillexStore` gains `runCardAction(skillId, label, fn)` and
  `busyCards: Set<string>` so card-level actions render a localized
  spinner instead of a full-page overlay. The existing `runAction`
  becomes `runGlobalAction` for refresh / sync / source mutations.
- `SkillCard.vue` shows a per-card busy state when
  `store.state.busyCards.has(skill.id)` (button disabled + small
  spinner). The rest of the page remains interactive.
- New `Skeleton.vue` component + skeleton grid rendered until the first
  `refreshAll()` resolves. Catalog and Doctor pages render skeletons
  during their initial fetch.
- `SkillManifest` and `CatalogEntry` gain an optional `category?: string`
  field. `parseSkillFrontmatter` extracts `category:` when present.
  `normalizeSkill` in `catalog.ts` propagates it. `CatalogPage.vue`
  prefers the explicit category, falls back to the regex inference, and
  shows a small `(inferred)` chip when fallback was used.
- `SkillexStore` gains `doctorStatus: "pass" | "warn" | "fail" | null`,
  loaded once on `initialize()` and refreshed after destructive actions.
  The sidebar Doctor link renders a small colored dot reflecting the
  aggregate status.
- A global keydown listener in `App.vue` focuses the search input on
  `Cmd+K` (Mac) or `Ctrl+K` (other platforms). When the search input is
  not on the current route, the shortcut navigates back to the catalog
  first and then focuses.
- `docs/media/` directory is created with a `README.md` placeholder that
  links to the recording instructions; the actual `.gif` / `.png` are
  tracked as a follow-up issue rather than committed binaries (so the
  npm tarball stays small).

## Impact

- Affected specs:
  - `interactive-ui` — per-card busy state, skeletons, sidebar health
    dot, Cmd+K shortcut, category badge fallback chip
  - `install` — optional `category` field on `SkillManifest`
  - `catalog` — `category` parsing from `skill.json` and SKILL.md
    frontmatter, propagation through the catalog response
- Affected code:
  - `ui/src/store.ts` — `runCardAction`, `runGlobalAction`,
    `busyCards`, `doctorStatus` reactive, `loadDoctorStatus`
  - `ui/src/components/SkillCard.vue` — per-card spinner
  - `ui/src/components/Skeleton.vue` (new)
  - `ui/src/pages/CatalogPage.vue` — skeleton + category resolution
  - `ui/src/pages/DoctorPage.vue` — skeleton during initial load
  - `ui/src/App.vue` — Cmd+K listener, sidebar health dot
  - `src/types.ts` — `category?: string` on `SkillManifest`
  - `src/skill.ts` — extract `category` in `parseSkillFrontmatter`
  - `src/catalog.ts` — propagate `category` through `normalizeSkill`
  - `README.md` — document the new optional `category` field; add a
    Demo section with placeholder paths under `docs/media/`
  - `docs/media/README.md` (new placeholder)
