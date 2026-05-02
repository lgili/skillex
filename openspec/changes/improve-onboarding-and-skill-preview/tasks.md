## 1. Recommended starter pack

- [ ] 1.1 Create `src/recommended.ts` exporting `RECOMMENDED_SKILL_IDS: readonly string[]` with `commit-craft`, `code-review`, `secure-defaults`, `error-handling`, `test-discipline`.
- [ ] 1.2 Add `--install-recommended` (boolean) flag to the `init` command schema.
- [ ] 1.3 In `handleInit`, when the flag is set, after writing the lockfile, call `installSkills` for each recommended id with progress output identical to `install --all`.
- [ ] 1.4 Add a test verifying that `init --install-recommended` writes both the lockfile and the five expected skills.

## 2. Updated post-init guidance

- [ ] 2.1 Replace the single `Next: run 'skillex list'` line in `handleInit` with a three-line block:
  - `Next steps:`
  - `  • Browse and install interactively:  skillex`
  - `  • Install a curated starter pack:    skillex install --recommended`
  - `  • List the full catalog:             skillex list`
- [ ] 2.2 Skip the block entirely when `--install-recommended` was used.

## 3. New `show` command

- [ ] 3.1 Register `show <id>` in the command dispatcher with help text.
- [ ] 3.2 Implement `handleShow` that resolves the skill (cross-source if needed, with the same ambiguity guard `install` uses), fetches the SKILL.md content, and prints:
  - manifest summary (name, version, author, tags, compatibility, files count)
  - a separator
  - the rendered SKILL.md (markdown to terminal-friendly text)
- [ ] 3.3 Add `--raw` flag to print the markdown unmodified.
- [ ] 3.4 Add `--json` flag to print the resolved manifest plus the raw SKILL.md as a single JSON object.
- [ ] 3.5 Add coverage in `test/cli.test.ts`.

## 4. `--tags` alias and README correction

- [ ] 4.1 Accept `--tags` as a hidden alias of `--tag` in the `search` command schema.
- [ ] 4.2 Correct the README example at line 152 to use `--tag <tag>`.
- [ ] 4.3 Add a release note that `--tags` was previously documented but ignored, and is now both fixed and aliased for compatibility.

## 5. README onboarding rewrite

- [ ] 5.1 Insert a "Why Skillex" section above Quick Start: 3 bullets summarizing the value vs. submodules, copy-paste, and per-agent manual config.
- [ ] 5.2 Rewrite Quick Start to lead with `npx skillex@latest` (the TUI) as the primary path; demote the three-command chain to "Scriptable mode."
- [ ] 5.3 Add a "Demo" section between Quick Start and Installation with two embedded media references (TUI GIF, Web UI screenshot).

## 6. Demo media

- [ ] 6.1 Create `docs/media/` directory.
- [ ] 6.2 Record a ~10-second TUI screencast (`tui.gif`) showing init → TUI launch → filter → select → install.
- [ ] 6.3 Capture a Web UI catalog screenshot (`web-ui.png`) at 1280×800 with one card hovered.
- [ ] 6.4 Reference both via raw GitHub URLs (so they are not bundled into the npm tarball); ensure `docs/` is excluded from the npm package.
