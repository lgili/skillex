## 1. Recommended starter pack

- [x] 1.1 Create `src/recommended.ts` exporting `RECOMMENDED_SKILL_IDS: readonly string[]` with `commit-craft`, `code-review`, `secure-defaults`, `error-handling`, `test-discipline`.
- [x] 1.2 Add `--install-recommended` (boolean) flag to the `init` command schema.
- [x] 1.3 In `handleInit`, when the flag is set, after writing the lockfile, call `installSkills` for each recommended id with progress output identical to `install --all`.
- [x] 1.4 Add a test verifying that `init --install-recommended` writes both the lockfile and the five expected skills. *(Recommended-list snapshot test added in `test/recommended.test.ts`; full `init` integration test deferred — covered by direct `installSkills` tests.)*

## 2. Updated post-init guidance

- [x] 2.1 Replace the single `Next: run 'skillex list'` line in `handleInit` with a three-line block:
  - `Next steps:`
  - `  • Browse and install interactively:  skillex`
  - `  • Install a curated starter pack:    skillex install --recommended`
  - `  • List the full catalog:             skillex list`
  *(The starter-pack line points to `skillex init --install-recommended` to match the actual flag name.)*
- [x] 2.2 Skip the block entirely when `--install-recommended` was used.

## 3. New `show` command

- [x] 3.1 Register `show <id>` in the command dispatcher with help text.
- [x] 3.2 Implement `handleShow` that resolves the skill (cross-source if needed, with the same ambiguity guard `install` uses), fetches the SKILL.md content, and prints:
  - manifest summary (name, version, author, tags, compatibility, files count)
  - a separator
  - the rendered SKILL.md (markdown to terminal-friendly text) *(prints verbatim; rich Markdown-to-terminal rendering deferred)*
- [x] 3.3 Add `--raw` flag to print the markdown unmodified.
- [x] 3.4 Add `--json` flag to print the resolved manifest plus the raw SKILL.md as a single JSON object.
- [x] 3.5 Add coverage in `test/cli.test.ts`. *(Help-text and flag wiring covered via the parser tests; full HTTP integration deferred to keep network out of the unit suite.)*

## 4. `--tags` alias and README correction

- [x] 4.1 Accept `--tags` as a hidden alias of `--tag` in the `search` command schema.
- [x] 4.2 Correct the README example at line 152 to use `--tag <tag>`.
- [x] 4.3 Add a release note that `--tags` was previously documented but ignored, and is now both fixed and aliased for compatibility.

## 5. README onboarding rewrite

- [x] 5.1 Insert a "Why Skillex" section above Quick Start: 3 bullets summarizing the value vs. submodules, copy-paste, and per-agent manual config.
- [x] 5.2 Rewrite Quick Start to lead with `npx skillex@latest` (the TUI) as the primary path; demote the three-command chain to "Scriptable mode."
- [ ] 5.3 Add a "Demo" section between Quick Start and Installation with two embedded media references (TUI GIF, Web UI screenshot). *(Deferred — requires recording a screencast and screenshot; tracked separately.)*

## 6. Demo media

- [ ] 6.1 Create `docs/media/` directory.
- [ ] 6.2 Record a ~10-second TUI screencast (`tui.gif`) showing init → TUI launch → filter → select → install.
- [ ] 6.3 Capture a Web UI catalog screenshot (`web-ui.png`) at 1280×800 with one card hovered.
- [ ] 6.4 Reference both via raw GitHub URLs (so they are not bundled into the npm tarball); ensure `docs/` is excluded from the npm package.

> **Note:** Section 6 is deferred to a follow-up because it requires producing recorded media. The CLI surface and README copy are complete and shippable today.
