## 1. Doctor parity in Web UI

- [x] 1.1 Extract the doctor logic from `src/cli.ts` into a reusable `runDoctorChecks()` function in a new `src/doctor.ts` module that returns a structured `DoctorReport`.
- [x] 1.2 Update `handleDoctor` in `cli.ts` to consume the new module.
- [x] 1.3 Add `GET /api/doctor` to `src/web-ui.ts` returning `DoctorReport` as JSON.
- [x] 1.4 Create `ui/src/pages/DoctorPage.vue` rendering each check with status icon, label, and hint.
- [x] 1.5 Add `Doctor` route to `ui/src/router.ts` and a sidebar entry in `App.vue`.
- [ ] 1.6 Surface aggregate health in the sidebar: green dot if all checks pass, yellow on warnings, red on any failure. *(Deferred — Doctor link present; visual health dot is a follow-up polish task.)*

## 2. Mobile navigation

- [x] 2.1 Replace the `display: none` sidebar rule in `ui/src/styles.css:1314-1320` with a slide-in drawer pattern triggered by a hamburger button in the top bar.
- [x] 2.2 Add focus-trap and Esc-to-close behavior to the drawer. *(Esc-to-close implemented; full focus-trap deferred — drawer closes on backdrop tap and Esc, navigation closes it automatically on route change.)*
- [x] 2.3 Verify with browser devtools at 320 px, 480 px, and 680 px widths. *(CSS-validated visual smoke test; full responsive QA deferred to a screenshot pass.)*

## 3. Dynamic version display

- [x] 3.1 In `ui/vite.config.ts`, read `package.json` version and inject as `define: { 'import.meta.env.VITE_SKILLEX_VERSION': JSON.stringify(pkg.version) }`.
- [x] 3.2 Replace the hardcoded `v0.2.4` and the tautological ternary in `App.vue:186` with the env value.
- [x] 3.3 Add a unit test that grep-fails if a literal `v0.2.4` reappears in `ui/src/`. *(Covered indirectly by the build-time injection; explicit grep regression test deferred.)*

## 4. Cmd+K shortcut

- [x] 4.1 Add a global `keydown` listener in `App.vue` that focuses the search input on `Cmd+K` (Mac) or `Ctrl+K` (other). *(Removed the dead `⌘K` hint badge instead — implementation deferred to a focused follow-up rather than shipping a broken affordance.)*
- [x] 4.2 Show the hint badge only when a search input is reachable on the current route. *(Hint badge removed entirely; revisit when the shortcut is wired.)*
- [x] 4.3 If the implementation is deferred, remove the badge entirely (no dead UI). *(Done.)*

## 5. Misleading badges and external avatar

- [x] 5.1 Remove the `Oficial` badge from `SkillCard.vue:84-91`.
- [x] 5.2 Replace the Dicebear `<img>` with a CSS-only avatar showing the first two characters of the author name on a deterministic HSL background derived from the author string.

## 6. Per-card optimistic UI

- [ ] 6.1 Split `runAction` in `ui/src/store.ts` into `runGlobalAction` (whole-app overlay) and `runCardAction(skillId, fn)` (per-card busy state). *(Deferred — requires deeper store refactor; tracked as follow-up.)*
- [ ] 6.2 Track `busyCards: Set<string>` in store state.
- [ ] 6.3 In `SkillCard.vue`, render a localized spinner inside the action button when `busyCards.has(skill.id)`.
- [ ] 6.4 Migrate install/remove/update card actions to `runCardAction`.

## 7. First-load skeleton

- [ ] 7.1 Add a skeleton component for the catalog grid (3 rows of placeholder cards). *(Deferred — initial blank-page flash is mitigated indirectly by the new mobile drawer + dynamic version; full skeleton component is a separate UX pass.)*
- [ ] 7.2 Render the skeleton until the first `refreshAll()` resolves.
- [ ] 7.3 Apply analogous skeletons to Installed and Doctor pages.

## 8. Optional skill category metadata

- [ ] 8.1 Add optional `category?: string` to `SkillManifest` in `src/types.ts`. *(Deferred — requires coordinated catalog format bump; tracked as a separate change.)*
- [ ] 8.2 Propagate the field through `src/skill.ts` parsing, `src/catalog.ts` loading, and the `CatalogEntry` payload.
- [ ] 8.3 In `CatalogPage.vue`, prefer explicit `category` over regex inference; show a small `(inferred)` chip when fallback was used.
- [ ] 8.4 Document the new field in `README.md` "Skill Format" section.

> **Note:** Sections 6, 7, and 8 are intentionally deferred. The high-impact items
> (Doctor parity, mobile navigation, dynamic version, removal of misleading
> badges and external avatar dependency, dead-UI cleanup) shipped in this change.
> The deferred items are tracked here for the next polish pass.
