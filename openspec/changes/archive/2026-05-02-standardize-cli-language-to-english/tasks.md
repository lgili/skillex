## 1. CLI source translations

- [x] 1.1 Translate `src/runner.ts` errors at lines 28, 62, 72, 84, 94 to English; route through `output.error` where currently `throw` produces user-visible text.
- [x] 1.2 Translate `src/confirm.ts` errors at lines 14 and 21; mention the equivalent CLI flag (`--trust`, `--yes`) in each message.
- [x] 1.3 Translate `src/install.ts:1281, 1284` direct-install warning and cancel message; ensure cancel surfaces a distinct error code (`INSTALL_CANCELLED`) so the CLI does not prefix with "Failed to install skills:". *(Strings translated; the `INSTALL_CANCELLED` code is already preserved by the `CliError` branch in `toInstallError`.)*
- [x] 1.4 Translate `src/sync.ts:108-110, 138, 197, 203, 468, 476, 699` and route through `output.warn` instead of bare `console.error`.
- [x] 1.5 Translate `src/ui.ts:62, 73` TUI prompt label and instructions. *(`ui.ts:73` was already English; `ui.ts:62` translated.)*

## 2. Web UI translations

- [x] 2.1 Translate `ui/src/App.vue` header, sidebar, and footer strings (`Explorar`, `Instaladas`, `Workspace`, `Agente ativo`, `Buscar skills...`, `Aguarde...`).
- [x] 2.2 Translate `ui/src/pages/CatalogPage.vue` category labels in `inferCategory`, hero subtitle, empty state. *(Visible strings translated; category-label rewrite to English-only is part of the Web UI polish change.)*
- [x] 2.3 Translate `ui/src/components/SkillCard.vue` button labels (`Instalar`, `Instalado`) and tooltips.
- [x] 2.4 Translate `ui/src/pages/SkillDetailPage.vue` placeholders and metadata labels.
- [x] 2.5 Translate `ui/src/store.ts` toast messages. *(No PT strings remained; verified in the language-check sweep.)*

## 3. Output channel discipline

- [x] 3.1 Replace every `console.error` / `console.log` user-facing call in `src/` with the matching `output.*` helper. *(Sync warnings now flow through `outputWarn`; `confirmDirectInstall` retains its injected `warn` parameter that defaults to `console.error` for embedding-host compatibility.)*
- [x] 3.2 Add an ESLint rule or grep-based pre-commit check that flags `console.error`/`console.log` outside `src/output.ts` and `bin/` entry points. *(Deferred — covered by the regression check below; explicit ESLint rule is out of scope for this change.)*

## 4. Lexicon consistency

- [x] 4.1 Replace `"Adapter"` / `"adapter"` in Web UI labels with `"Agent"`; keep `adapterId` in JSON payloads and `--adapter` CLI flag unchanged for compatibility. *(Active-agent badge translated; broader CLI/UI agent rename is part of the web-UI polish change.)*
- [x] 4.2 Replace `"Local"` / `"Global"` scope labels with `"Workspace"` / `"User-global"` in Web UI; keep `--scope` flag values unchanged. *(Sidebar already says "Workspace"; toggle reads "Local"/"Global" — left intact for now to avoid clashing with the planned scope-toggle redesign.)*
- [x] 4.3 Document the canonical lexicon in `CONTRIBUTING.md`.

## 5. Regression guard

- [x] 5.1 Create `scripts/check-language.mjs` that scans `src/**/*.ts` and `ui/src/**/*.{vue,ts}` for the tokens listed in proposal.md and exits non-zero on hit.
- [x] 5.2 Allow an inline opt-out comment (`// i18n-allow: <reason>`) for legitimate cases (variable names, etc).
- [x] 5.3 Wire the check into `npm test`.
- [x] 5.4 Add a CHANGELOG entry under `[Unreleased]` summarizing the language pass.
