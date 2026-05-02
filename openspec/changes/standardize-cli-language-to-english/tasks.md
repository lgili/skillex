## 1. CLI source translations

- [ ] 1.1 Translate `src/runner.ts` errors at lines 28, 62, 72, 84, 94 to English; route through `output.error` where currently `throw` produces user-visible text.
- [ ] 1.2 Translate `src/confirm.ts` errors at lines 14 and 21; mention the equivalent CLI flag (`--trust`, `--yes`) in each message.
- [ ] 1.3 Translate `src/install.ts:1281, 1284` direct-install warning and cancel message; ensure cancel surfaces a distinct error code (`INSTALL_CANCELLED`) so the CLI does not prefix with "Failed to install skills:".
- [ ] 1.4 Translate `src/sync.ts:108-110, 138, 197, 203, 468, 476, 699` and route through `output.warn` instead of bare `console.error`.
- [ ] 1.5 Translate `src/ui.ts:62, 73` TUI prompt label and instructions.

## 2. Web UI translations

- [ ] 2.1 Translate `ui/src/App.vue` header, sidebar, and footer strings (`Explorar`, `Instaladas`, `Workspace`, `Agente ativo`, `Buscar skills...`, `Aguarde...`).
- [ ] 2.2 Translate `ui/src/pages/CatalogPage.vue` category labels in `inferCategory`, hero subtitle, empty state.
- [ ] 2.3 Translate `ui/src/components/SkillCard.vue` button labels (`Instalar`, `Instalado`) and tooltips.
- [ ] 2.4 Translate `ui/src/pages/SkillDetailPage.vue` placeholders and metadata labels.
- [ ] 2.5 Translate `ui/src/store.ts` toast messages.

## 3. Output channel discipline

- [ ] 3.1 Replace every `console.error` / `console.log` user-facing call in `src/` with the matching `output.*` helper.
- [ ] 3.2 Add an ESLint rule or grep-based pre-commit check that flags `console.error`/`console.log` outside `src/output.ts` and `bin/` entry points.

## 4. Lexicon consistency

- [ ] 4.1 Replace `"Adapter"` / `"adapter"` in Web UI labels with `"Agent"`; keep `adapterId` in JSON payloads and `--adapter` CLI flag unchanged for compatibility.
- [ ] 4.2 Replace `"Local"` / `"Global"` scope labels with `"Workspace"` / `"User-global"` in Web UI; keep `--scope` flag values unchanged.
- [ ] 4.3 Document the canonical lexicon in `CONTRIBUTING.md`.

## 5. Regression guard

- [ ] 5.1 Create `scripts/check-language.mjs` that scans `src/**/*.ts` and `ui/src/**/*.{vue,ts}` for the tokens listed in proposal.md and exits non-zero on hit.
- [ ] 5.2 Allow an inline opt-out comment (`// i18n-allow: <reason>`) for legitimate cases (variable names, etc).
- [ ] 5.3 Wire the check into `npm test`.
- [ ] 5.4 Add a CHANGELOG entry under `[Unreleased]` summarizing the language pass.
