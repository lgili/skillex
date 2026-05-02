# install Specification

## Purpose
TBD - created by archiving change refactor-typescript-migration. Update Purpose after archive.
## Requirements
### Requirement: Typed Lockfile State

The lockfile (`skills.json`) structure SHALL be described by the `LockfileState` TypeScript interface with typed fields: `formatVersion: number`, `createdAt: string`, `updatedAt: string`, `sources: LockfileSource[]`, `adapters: LockfileAdapters`, `settings: LockfileSettings`, `sync: SyncMetadata | null`, `syncMode: SyncWriteMode | null`, and `installed: Record<string, InstalledSkill>`.

#### Scenario: getInstalledSkills returns typed state with sources

- **WHEN** `getInstalledSkills()` resolves
- **THEN** the returned object satisfies `LockfileState`
- **AND** the lockfile contains a non-empty `sources` array instead of a single persisted `catalog` object

### Requirement: Typed Installed Skill Entry
Each entry in `LockfileState.installed` SHALL conform to `InstalledSkill` with fields `name: string`, `version: string`, `path: string`, `installedAt: string`, `compatibility: string[]`, and `tags: string[]`.

#### Scenario: Installed entry has correct shape
- **WHEN** `installSkills()` resolves after successfully installing a skill
- **THEN** the new entry in `skills.json` satisfies `InstalledSkill` with all required fields present

### Requirement: Typed Error Classes for Installation
`installSkills()`, `updateInstalledSkills()`, and `removeSkills()` SHALL throw `InstallError` (not a generic `Error`) on failure, with a `code: string` field classifying the reason.

#### Scenario: Missing skill throws InstallError
- **WHEN** `installSkills()` is called with a skill ID absent from the catalog
- **THEN** an `InstallError` is thrown with `code: "SKILL_NOT_FOUND"`
- **AND** the error message includes the missing skill ID

#### Scenario: Corrupt lockfile throws InstallError
- **WHEN** `skills.json` exists but contains invalid JSON
- **THEN** reading it fails through an `InstallError` rather than a generic `Error`

### Requirement: TSDoc on Install Exports
Every exported function in `src/install.ts` SHALL have a TSDoc comment describing parameters, return type, and thrown errors.

#### Scenario: IDE shows documentation on hover
- **WHEN** a developer hovers over `installSkills` in a TypeScript-aware editor
- **THEN** the editor displays the function signature, TSDoc description, and thrown error types

### Requirement: Migrate Legacy Single-Catalog Lockfiles

The installer SHALL read legacy lockfiles containing `catalog` and migrate them to `sources` on the next write.

#### Scenario: Legacy lockfile is upgraded transparently

- **WHEN** a workspace contains `.agent-skills/skills.json` with `catalog.repo` and `catalog.ref`
- **THEN** install-state operations continue to work without manual migration
- **AND** the next persisted lockfile writes an equivalent entry into `sources`

### Requirement: Initialize With A Default First-Party Source

The installer SHALL initialize new workspaces with `lgili/skillex@main` as the default source when no explicit repository override is provided.

#### Scenario: Init without repo seeds official source

- **WHEN** the user initializes a workspace without `--repo`
- **THEN** `.agent-skills/skills.json` is created with `sources[0]` set to `lgili/skillex` at ref `main`
- **AND** subsequent `list` and `install` commands can use the first-party catalog immediately

#### Scenario: Explicit repo override replaces the default seed for init

- **WHEN** the user runs `skillex init --repo myorg/my-skills`
- **THEN** the initialized workspace stores `myorg/my-skills` as the configured source for that workspace
- **AND** does not require `lgili/skillex` to be auto-added alongside the explicit source

### Requirement: Support Local And Global Install State

Skillex SHALL support two install scopes: `local` for the current workspace and `global` for the current user account.

- Local state SHALL be rooted at `.agent-skills/` inside the current workspace.
- Global state SHALL be rooted at `~/.skillex/`.
- Both scopes SHALL persist a `skills.json` lockfile and a `skills/<skill-id>/` managed store.

#### Scenario: Initialize local state by default

- **WHEN** the user runs `skillex init` in a workspace
- **THEN** Skillex creates `.agent-skills/skills.json`
- **AND** does not create or modify `~/.skillex/skills.json`

#### Scenario: Initialize global state explicitly

- **WHEN** the user runs `skillex init --global --adapter codex`
- **THEN** Skillex creates `~/.skillex/skills.json`
- **AND** records `codex` as the active adapter for the global scope
- **AND** does not require a workspace `.agent-skills/skills.json` to exist

### Requirement: Scope Isolation For Installed Skills

Commands that mutate installed skills SHALL only affect the selected scope.

#### Scenario: Global install does not modify workspace state

- **WHEN** the user runs `skillex install create-skills --global`
- **THEN** the skill is recorded in `~/.skillex/skills.json`
- **AND** the managed files are stored under `~/.skillex/skills/create-skills/`
- **AND** `.agent-skills/skills.json` remains unchanged

#### Scenario: Local remove does not remove global install

- **WHEN** `create-skills` is installed in both scopes
- **AND** the user runs `skillex remove create-skills`
- **THEN** the local `.agent-skills/skills/create-skills/` directory is removed
- **AND** the global `~/.skillex/skills/create-skills/` directory remains present

### Requirement: Module Boundaries Inside the Install Subsystem

The install subsystem MUST be organized so that no single source file mixes install orchestration with lockfile shape, direct-GitHub install, and auto-sync orchestration. The shared file-download loop MUST live in a single helper used by both catalog and direct-install paths.

#### Scenario: Lockfile concerns live in lockfile.ts

- **WHEN** a contributor needs to read or modify lockfile shape, normalization, or source-list dedupe
- **THEN** the canonical implementation is in `src/lockfile.ts`
- **AND** `src/install.ts` only re-exports for backward compatibility

#### Scenario: Direct-install concerns live in direct-github.ts

- **WHEN** a contributor needs to modify how `owner/repo/path@ref` URLs are parsed, fetched, or confirmed
- **THEN** the canonical implementation is in `src/direct-github.ts`
- **AND** `src/install.ts` only re-exports for backward compatibility

#### Scenario: Auto-sync concerns live in auto-sync.ts

- **WHEN** a contributor needs to modify post-install or post-remove sync orchestration
- **THEN** the canonical implementation is in `src/auto-sync.ts`
- **AND** `src/install.ts` only re-exports for backward compatibility

#### Scenario: Single downloader for both paths

- **WHEN** the catalog path or direct-install path needs to fetch a skill's files
- **THEN** both call `downloadSkillFiles` from `src/downloader.ts`
- **AND** no parallel implementation of the same loop exists in another module

### Requirement: Single Frontmatter Parser

The codebase MUST expose exactly one frontmatter parser (`parseSkillFrontmatter` in `src/skill.ts`). Catalog ingestion MUST call this parser; the previously inline helpers (`extractSkillMetadata`, `extractFrontmatterValue` in `src/catalog.ts`) MUST be deleted.

#### Scenario: Catalog uses canonical parser

- **WHEN** `src/catalog.ts` falls back to reading SKILL.md frontmatter
- **THEN** it calls `parseSkillFrontmatter` from `src/skill.ts`
- **AND** `extractSkillMetadata` and `extractFrontmatterValue` no longer exist in `catalog.ts`

#### Scenario: Quoted-value parity

- **WHEN** a SKILL.md frontmatter value is quoted (single or double), multi-line, or contains a `:` character
- **THEN** the parsed value is identical regardless of whether the call originated from skill discovery or catalog fallback

### Requirement: Stable Public API Surface

The refactor MUST NOT change the symbols exported via `package.json#exports`. Library consumers importing from `skillex/install`, `skillex/catalog`, `skillex/sync`, etc., MUST continue to receive the same exported names with the same signatures.

#### Scenario: Existing import paths still work

- **WHEN** an external project imports `import { installSkills, normalizeLockfile, parseDirectGitHubRef } from 'skillex/install'`
- **THEN** every symbol is exported from the same path post-refactor
- **AND** the type signatures are unchanged

#### Scenario: No new export entries are added

- **WHEN** `package.json#exports` is inspected after the refactor
- **THEN** no new entry has been added (the new internal modules are reached via the existing `./install` re-export shim)

### Requirement: Parallel Skill File Downloads

`downloadSkill` and `downloadDirectGitHubSkill` MUST issue all per-skill
file fetches concurrently rather than sequentially. The shared download
implementation MUST be extracted into a single helper used by both code
paths to prevent future divergence.

#### Scenario: A skill with multiple files downloads in parallel

- **WHEN** a skill manifest declares N files and the install path runs
- **THEN** the downloader issues N concurrent fetches
- **AND** total wall-clock time approximates the slowest single fetch
  rather than the sum of all fetches

#### Scenario: Direct-install path uses the same helper

- **WHEN** `skillex install owner/repo/path@ref` runs
- **THEN** the file-download helper invoked is the same one used by the
  catalog install path

### Requirement: Lockfile Path Safety on Remove

`removeSkill` MUST validate `metadata.path` from the lockfile against the
managed skills store before unlinking any directory. A path that resolves
outside the managed root MUST raise `INSTALL_PATH_UNSAFE` and abort the
removal without modifying the filesystem.

#### Scenario: Tampered lockfile path is refused

- **WHEN** the lockfile contains a skill whose `path` resolves to
  `/etc/passwd` or escapes the managed root via `..`
- **THEN** `removeSkill` raises `INSTALL_PATH_UNSAFE`
- **AND** the targeted path is not deleted

#### Scenario: Legitimate path proceeds normally

- **WHEN** `metadata.path` resolves inside the managed skills store
- **THEN** the skill directory is removed as before

### Requirement: Direct-Install Ref Character Validation

`parseDirectGitHubRef` MUST validate the ref segment against
`^[A-Za-z0-9_.\-/]+$` and reject any other character (including newlines,
spaces, shell metacharacters, and quotes). An empty ref after `@` MUST
also be rejected rather than silently defaulting to `main`.

#### Scenario: Valid ref is accepted

- **WHEN** the user passes `owner/repo@v1.2.0` or `owner/repo@feature/foo`
- **THEN** the ref is parsed successfully

#### Scenario: Ref with disallowed characters is rejected

- **WHEN** the user passes `owner/repo@main;rm -rf /` or any ref containing
  characters outside the allowed set
- **THEN** `parseDirectGitHubRef` raises `CliError` with code
  `INVALID_DIRECT_REF`
- **AND** the offending value is included in the error message

#### Scenario: Empty ref is rejected

- **WHEN** the user passes `owner/repo@`
- **THEN** the parser raises `INVALID_DIRECT_REF` rather than defaulting
  to `main`

### Requirement: Multi-Adapter Remove Sync Aggregation

`maybeSyncAfterRemove` MUST sync all detected adapters concurrently and
return an aggregate result containing one `SyncMetadata` entry per adapter.
CLI output MUST list each adapter's outcome.

#### Scenario: Removing a skill in a multi-adapter workspace

- **WHEN** a workspace has both `claude` and `codex` adapters detected
  and the user removes a skill
- **THEN** both adapters are synced
- **AND** the returned aggregate contains entries for both adapters
- **AND** the CLI prints one summary line per adapter

### Requirement: Preserved Error Codes on Install Failure

`toInstallError` MUST preserve the original underlying error code (such as
`EACCES`, `ENOENT`, or any HTTP error code) when wrapping a non-Skillex
error into `InstallError`, surfacing it both in the structured error and
in the formatted message.

#### Scenario: Filesystem error code is preserved

- **WHEN** an install operation throws `EACCES` from `fs.writeFile`
- **THEN** the wrapped `InstallError` exposes `code: "EACCES"`
- **AND** the message includes `(EACCES)` in human-readable form

#### Scenario: HTTP error code is preserved

- **WHEN** an install operation receives `HTTP_RATE_LIMIT`
- **THEN** the wrapped `InstallError` exposes `code: "HTTP_RATE_LIMIT"`
- **AND** the user can react without parsing the message

### Requirement: Lockfile Source Dedupe Expression

`toLockfileSource` MUST express its label-inclusion logic as a clearly
named boolean (such as `wantsLabel`) rather than a duplicated compound
expression. The behavior MUST remain unchanged: the `label` field is
included when an explicit label was provided OR when the source is the
default first-party repo.

#### Scenario: Label survives for the default repo

- **WHEN** the source is the default `lgili/skillex` repo without an
  explicit label
- **THEN** `toLockfileSource` returns an object whose `label` field equals
  `"official"`

#### Scenario: Label survives when explicit

- **WHEN** the source is any repo with a non-empty `label`
- **THEN** the returned object includes that label verbatim

#### Scenario: Label is omitted otherwise

- **WHEN** the source is a non-default repo without a label
- **THEN** the returned object does NOT contain a `label` field

### Requirement: English Direct-Install Messages

The direct-install code path in `src/install.ts` MUST emit its warnings, prompts, and cancellation messages in English. User cancellation MUST raise an `INSTALL_CANCELLED` error code that the CLI translates into a friendly exit (no `Failed to install skills:` prefix).

#### Scenario: Direct-install warning is in English

- **WHEN** the user runs `skillex install owner/repo/path@ref` without `--trust`
- **THEN** the printed warning text is in English and clearly explains the trust implication

#### Scenario: Direct-install cancellation produces a clean exit

- **WHEN** the user answers "n" to the trust prompt
- **THEN** the CLI prints an English cancellation notice
- **AND** the exit message does NOT contain the prefix `Failed to install skills:`
- **AND** the underlying error code is `INSTALL_CANCELLED`

### Requirement: Optional Skill Category Field

The `SkillManifest` shape MUST accept an optional `category?: string` field so catalog publishers can group skills explicitly instead of relying on consumer-side inference. The field MUST be stored verbatim in the lockfile and forwarded by every catalog response.

#### Scenario: Manifest carries explicit category

- **WHEN** a `skill.json` declares `"category": "code"`
- **THEN** the parsed `SkillManifest` exposes `category: "code"`
- **AND** the catalog response forwards the same value

#### Scenario: Manifest omits category

- **WHEN** a `skill.json` does not declare `category`
- **THEN** the parsed `SkillManifest` has `category: undefined`
- **AND** consumers may apply their own inference

