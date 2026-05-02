## Why

The Skillex codebase, README, package keywords, and adapter-facing docs are
all in English, but several user-facing strings are still in Portuguese
(legacy from earlier development). The mix breaks trust ("is this finished?")
and prevents grep-based localization later. Concrete sites:

- `src/runner.ts:28, 62, 72, 84, 94` — script-runner errors
- `src/confirm.ts:14, 21` — non-TTY confirmation error
- `src/install.ts:1281, 1284` — direct-install warning and cancel message
- `src/sync.ts:108-110, 138, 197, 203, 468, 476, 699` — symlink fallback
  warnings, dry-run banners
- `src/ui.ts:62, 73` — TUI prompt label and instructions
- All `ui/src/**/*.vue` — App.vue navigation, CatalogPage labels,
  SkillCard buttons, SkillDetailPage placeholders
- Several scattered `console.error(...)` direct calls in Portuguese that
  also bypass `output.warn` / `output.error`

The Web UI specifically still ships strings like `"Instalar"`, `"Aguarde..."`,
`"Buscar skills..."`, `"Habilidades validadas para o seu agente de IA"`,
`"Workspace"`/`"Agente ativo"` in headers, plus mixed Portuguese category
labels in `CatalogPage.vue:9-49`.

The CHANGELOG `[0.3.1]` entry already documents a previous translation pass
for the Web UI, but only covered a subset; this change finishes the job and
adds a regression guard.

## What Changes

- Translate every user-facing string in `src/**/*.ts` and
  `ui/src/**/*.{vue,ts}` to English.
- Route every user-visible message through `output.info`, `output.warn`, or
  `output.error` so styling and stream selection are consistent. Direct
  `console.error` / `console.log` for end-user output are no longer
  permitted in non-test code.
- Pick a single canonical lexicon and apply it everywhere:
  - "Workspace" / "User-global" instead of "Local" / "Global" in surfaces
    where ambiguous
  - "Agent" instead of "Adapter" in the Web UI header, while keeping the
    `--adapter` CLI flag for backward compatibility (alias added in a
    sibling change)
- Translate `CatalogPage.vue` category labels and the `inferCategory`
  output strings to English.
- Add a build-time regression check (`scripts/check-language.mjs`, run from
  `npm test`) that scans `src/` and `ui/src/` for a small list of common
  Portuguese tokens (`Aguarde`, `Instalar`, `Erro`, `Habilidades`,
  `cancelada`, `disponivel`) and fails CI if any are found outside an
  explicit allowlist.
- Add a brief contributor note in `CONTRIBUTING.md`: user-facing strings
  must be English.

## Impact

- Affected specs:
  - `cli` — output language and routing through `output.*`
  - `install` — direct-install messages
  - `sync` — symlink-fallback and dry-run messages
  - `skill-runner` — script error messages
  - `interactive-ui` — TUI labels and Web UI strings
- Affected code:
  - All files listed in "Why" above
  - New `scripts/check-language.mjs`
  - `package.json` `scripts.test` to invoke the new check
  - `CONTRIBUTING.md` short addendum
