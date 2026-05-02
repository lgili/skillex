## ADDED Requirements

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
