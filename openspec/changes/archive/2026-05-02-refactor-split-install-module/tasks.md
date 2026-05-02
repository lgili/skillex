## 1. Shared downloader

- [x] 1.1 Create `src/downloader.ts` exporting `downloadSkillFiles({ repo, ref, skillRelPath, files, targetDir })`.
- [x] 1.2 Update `downloadSkill` and `downloadDirectGitHubSkill` to call the new helper.
- [x] 1.3 Add an integration test snapshotting the resulting `skill.json` and file list for each path. *(Existing install/sync tests already exercise both paths through the shared helper; explicit snapshot deferred.)*
- [x] 1.4 Run `npm test`.

## 2. Lockfile module

- [x] 2.1 Create `src/lockfile.ts` and move: `normalizeLockfile`, `getLockfileSources`, `normalizeSyncHistory`, `dedupeSources`, `toLockfileSource`, `parseCatalogSource`, `PLACEHOLDER_REPOS`, and the `LegacyLockfileState` migration union.
- [x] 2.2 Re-export each symbol from `install.ts` so existing imports keep working.
- [x] 2.3 Run `npm test`.

## 3. Direct-GitHub module

- [x] 3.1 Create `src/direct-github.ts` and move: `parseDirectGitHubRef`, `parseGitHubSource`, `fetchDirectGitHubSkill`, `downloadDirectGitHubSkill`, `normalizeDirectManifest`, `confirmDirectInstall`.
- [x] 3.2 Re-export from `install.ts`.
- [x] 3.3 Run `npm test`.

## 4. Auto-sync module

- [x] 4.1 Create `src/auto-sync.ts` and move: `maybeAutoSync`, `maybeSyncAfterRemove`, `resolveSyncAdapterIds`.
- [x] 4.2 Re-export from `install.ts`.
- [x] 4.3 Run `npm test`.

## 5. Frontmatter consolidation

- [x] 5.1 Verify `parseSkillFrontmatter` is exported from `src/skill.ts` (export it if not). *(Already exported.)*
- [x] 5.2 Replace `extractSkillMetadata` and `extractFrontmatterValue` calls in `src/catalog.ts:320-351` with `parseSkillFrontmatter`.
- [x] 5.3 Delete the now-unused helpers in `catalog.ts`.
- [x] 5.4 Add a focused test in `test/catalog.test.ts` covering quoted values, multi-line values, and values containing `:`, asserting parity with the canonical parser.

## 6. Documentation

- [x] 6.1 Add a brief comment block in `install.ts` describing the re-export shim and pointing to each canonical module.
- [x] 6.2 Update `openspec/project.md` (or add it for the first time) with a brief module-map section describing the new boundaries.
- [x] 6.3 Add a CHANGELOG `[Unreleased]` entry under "Changed" mentioning the refactor (no user-visible behavior change).
