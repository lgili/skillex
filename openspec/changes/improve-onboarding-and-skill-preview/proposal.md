## Why

The first-run journey hides the best part of Skillex behind a chain of three
sequential commands and never tells the user the shortest path:

- The README Quick Start (`README.md:35-44`) prescribes
  `npx skillex@latest init` → `list` → `install <id>`. Three `npx` calls in
  a row is heavy, and the actually-delightful path (`skillex` with no
  arguments → interactive TUI) is buried at line 281.
- After `init` (`src/cli.ts:342-377`), the printed "Next" line says
  `run 'skillex list' to browse available skills`. A new user who just
  initialized expects something to happen, not a list dump. They also have
  zero skills installed at this point.
- There is no curated entry point: a new user has to read 32 skill names
  and pick. Most package managers offer `init --recommended` or an
  interactive picker that proposes a starter set.
- There is no way to preview a skill before installing. The Web UI shows
  the rendered SKILL.md on the detail page (`SkillDetailPage.vue:131-146`),
  but the CLI offers no equivalent. Users `install` blindly or manually
  fetch the raw file from GitHub.
- README documents `--tags` (`README.md:152`) but the CLI only accepts
  `--tag` (`src/cli.ts:79, 417`). The parser silently ignores `--tags`.
  A user who copies the example fails silently.
- The README has no GIF, screenshot, or animated demo of the TUI or Web
  UI — the two surfaces most likely to "wow" a first-time visitor.

## What Changes

- The Quick Start in `README.md` is rewritten to lead with the no-args
  TUI invocation (`npx skillex@latest`) as the primary path, with the
  `init`/`list`/`install` chain framed as "scriptable mode."
- `skillex init` adds an `--install-recommended` flag that, after init,
  installs a curated 4-5 skill starter pack defined in
  `src/recommended.ts` (initially: `commit-craft`, `code-review`,
  `secure-defaults`, `error-handling`).
- `skillex init` (no recommend flag) prints an updated "Next" block that
  recommends three concrete next steps: launch the TUI, install
  recommended, or list everything.
- A new `skillex show <id>` command prints the rendered SKILL.md plus
  the manifest fields (name, version, tags, compatibility, files) so
  users can preview without installing. `--raw` prints the markdown
  unmodified.
- `--tags` is accepted as an alias of `--tag` on the `search` command
  (and also on `list` if filtering is added there) for backward
  compatibility with the documented (broken) example. The README is
  corrected to use `--tag` as the canonical form.
- The README gains a "Demo" section near the top with a screencast GIF
  of the TUI and a screenshot of the Web UI catalog page. Asset paths
  live under `docs/media/` and are referenced via raw GitHub URLs so
  the npm package stays small.
- A short "Why Skillex" 3-bullet section is added to the top of the
  README, summarizing the value vs. ad-hoc git submodules and copy-paste.

## Impact

- Affected specs:
  - `cli` — new `show` command, new `--install-recommended` flag on
    `init`, `--tags` alias on `search`, updated post-init guidance
  - `skill-management-cli` — recommended-pack concept and curated list
    location
- Affected code:
  - `src/cli.ts` — handler for `show`, `--install-recommended`,
    rewritten post-init guidance, `--tags` alias
  - `src/recommended.ts` (new) — exports `RECOMMENDED_SKILL_IDS`
  - `src/markdown.ts` — already renders SKILL.md to plain text/HTML;
    add a `renderToTerminal` exported helper if needed
  - `README.md` — Quick Start rewrite, demo section, Why-Skillex
    bullets, `--tag`/`--tags` correction
  - `docs/media/` — new directory with `tui.gif` and `web-ui.png`
  - `test/cli.test.ts` — coverage for the new flag and command
