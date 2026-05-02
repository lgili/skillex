## Why

The Web UI delivered by `skillex ui` is the most marketable surface of the
project, but it has gaps and dead UI that undercut credibility:

- The `doctor` command is the strongest CLI feature (six health checks
  with actionable hints), and it is **completely invisible** in the Web
  UI. New users miss the most useful diagnostics.
- The mobile breakpoint (`@media (max-width: 680px)` in
  `ui/src/styles.css:1314-1320`) hides the sidebar entirely — there is no
  alternative navigation, so mobile visitors cannot reach Sources, Scope,
  or Sync history.
- `ui/src/App.vue:186` shows a hardcoded `v0.2.4` badge with a tautological
  ternary (`x ? '0.2.4' : '0.2.4'`); the actual published version is
  `0.3.1`.
- The header shows a `⌘K` hint (`App.vue:209`) without any Cmd+K keybinding
  wired.
- Every catalog skill renders an `Oficial` badge (`SkillCard.vue:84-91`)
  with no actual verification mechanism.
- Avatars are pulled from `dicebear.com/7.x/avataaars` (`SkillCard.vue:140`),
  causing an external request that breaks in offline contexts.
- Install/remove actions block the entire UI behind a global `state.busyLabel`
  overlay; a user who clicks Install on a card sees the whole app freeze for
  2-5 seconds.
- First-load shows a blank page for ~1 s — no skeleton or loader during
  initial `refreshAll()`.
- Categories on `CatalogPage.vue` are inferred via a hand-tuned regex over
  the current 32 skills; any third-party catalog falls into "Other"
  silently.

## What Changes

- A **Doctor panel** is added to the Web UI, calling a new
  `/api/doctor` endpoint that returns the same six checks as the CLI
  (lockfile, source, adapter, GitHub reachability, token status, cache
  freshness). Failure status surfaces a red dot in the sidebar.
- The mobile layout is reworked: instead of hiding the sidebar at
  ≤680 px, a top-bar hamburger toggles a slide-in drawer with the same
  navigation links and adapter chips.
- The version badge reads dynamically from a new
  `import.meta.env.VITE_SKILLEX_VERSION` injected by `vite.config.ts`
  from `package.json`.
- The `⌘K` hint becomes a real keybinding: pressing Cmd+K (Mac) or
  Ctrl+K (other platforms) focuses the search input. If implementation is
  not feasible in the change window, the hint badge is removed instead.
- The `Oficial` badge is removed until a real verification model exists
  (allowlist of trusted publishers in `catalog.json`); this is tracked
  in a follow-up but is out of scope here.
- The Dicebear avatar is replaced with a deterministic CSS-based avatar
  (initials on a hashed background color) to remove the external
  dependency.
- Card-level actions (install/remove/update) use **per-card optimistic
  UI**: the clicked card shows a localized spinner and dimmed state; the
  rest of the page remains interactive. The global `state.busyLabel`
  overlay is reserved for full-app blocking actions only.
- A first-load skeleton is rendered until `refreshAll()` resolves.
- Skills MAY declare an explicit `category` in `skill.json`; if absent,
  the regex inference falls back, but the category badge in the UI shows
  a small `(inferred)` chip so contributors can see when their metadata
  is incomplete.

## Impact

- Affected specs:
  - `interactive-ui` — Doctor panel, mobile navigation, version display,
    Cmd+K shortcut, removal of misleading Oficial badge, deterministic
    avatar, per-card action state, initial skeleton, category metadata
- Affected code:
  - `src/web-ui.ts` — new `/api/doctor` route reusing `cli.ts`
    `runDoctor` core
  - `ui/src/pages/DoctorPage.vue` (new), `ui/src/router.ts`,
    `ui/src/App.vue` sidebar entry and version source
  - `ui/src/components/SkillCard.vue` — remove Oficial badge, swap
    avatar, add per-card busy state
  - `ui/src/store.ts` — split `runAction` into `runGlobalAction` /
    `runCardAction` so callers choose the loading affordance
  - `ui/src/styles.css` — mobile drawer, skeleton placeholder
  - `ui/vite.config.ts` — inject `VITE_SKILLEX_VERSION`
  - `src/types.ts` — optional `category?: string` on `SkillManifest`
  - `src/skill.ts` / `src/catalog.ts` — read and propagate `category`
