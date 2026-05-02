## ADDED Requirements

### Requirement: Skill Preview Command

The CLI MUST provide a `show <id>` command that prints the manifest summary and the rendered SKILL.md content of a skill without installing it. The command MUST resolve cross-source ambiguity using the same rules as `install` (`--repo` disambiguator).

#### Scenario: Show renders the SKILL.md

- **WHEN** the user runs `skillex show git-master`
- **THEN** the manifest summary (name, version, author, tags, compatibility, file count) is printed
- **AND** the SKILL.md content is rendered to terminal-friendly text below a separator

#### Scenario: Raw output

- **WHEN** the user runs `skillex show git-master --raw`
- **THEN** the SKILL.md is printed verbatim (markdown unmodified)
- **AND** no manifest summary header is added

#### Scenario: JSON output

- **WHEN** the user runs `skillex show git-master --json`
- **THEN** the output is a single JSON object containing both the manifest fields and the raw SKILL.md string

#### Scenario: Ambiguous skill across sources

- **WHEN** the same skill id exists in two configured sources
- **THEN** the command raises `SHOW_AMBIGUOUS_SOURCE` and instructs the user to disambiguate with `--repo`

### Requirement: Recommended Starter Pack

The `init` command MUST accept an `--install-recommended` flag. When set, after the lockfile is created, the curated set defined in `src/recommended.ts` MUST be installed using the same code path as `install --all`, with identical progress output.

#### Scenario: Init with recommended pack

- **WHEN** the user runs `skillex init --install-recommended`
- **THEN** the lockfile is created
- **AND** every id in `RECOMMENDED_SKILL_IDS` is installed
- **AND** the install progress bar is rendered

#### Scenario: Recommended ids are stable

- **WHEN** the test suite runs
- **THEN** a snapshot test asserts the contents of `RECOMMENDED_SKILL_IDS` so changes are intentional

### Requirement: Improved Post-Init Guidance

The `init` command (without `--install-recommended`) MUST print a three-line "Next steps" block recommending the TUI, the recommended starter pack, and the full list — instead of a single line referring only to `skillex list`.

#### Scenario: Default post-init guidance

- **WHEN** `skillex init` completes successfully
- **THEN** the output ends with three lines:
  - `Browse and install interactively:  skillex`
  - `Install a curated starter pack:    skillex install --recommended`
  - `List the full catalog:             skillex list`

#### Scenario: Skipped when recommended is installed

- **WHEN** `skillex init --install-recommended` completes successfully
- **THEN** the three-line "Next steps" block is suppressed (the install summary stands alone)

### Requirement: --tags Alias for Search

The `search` command MUST accept `--tags` as a hidden alias of `--tag` so that the previously documented (and silently ignored) form continues to work.

#### Scenario: --tags forwards to --tag behavior

- **WHEN** the user runs `skillex search --tags workflow`
- **THEN** the search filters by the `workflow` tag identically to `--tag workflow`

#### Scenario: README documents the canonical form

- **WHEN** the README is rendered
- **THEN** the Search section shows `--tag <tag>` as the canonical flag
