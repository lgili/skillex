## Why

`src/install.ts` is the largest module in the codebase at **1326 lines /
44 KB**. It owns far more than installation:

- Project init (`init` command body)
- Install / update / remove orchestration
- Auto-sync orchestration after each mutation
- Lockfile shape, normalization, and migration
- Source-list management (add / remove / dedup)
- Direct GitHub install (a parallel pipeline to catalog install)
- Confirmation prompting for unsafe direct installs
- Two near-duplicate downloaders (`downloadSkill`,
  `downloadDirectGitHubSkill` — ~95 % shared code)
- Progress reporting plumbing
- A small skill-resolution helper that scans across configured sources

This makes the file hard to reason about and tests hard to author. Every
new feature (recommended pack, scoped sync, schema validation) lands in
the same wall of code. Two near-identical downloaders mean fixes to
retry, timeout, or etag logic must be applied twice.

A second smell: `src/skill.ts` and `src/catalog.ts` each carry their own
markdown-frontmatter parser. The catalog version (`extractSkillMetadata`
and `extractFrontmatterValue` in `catalog.ts:320-351`) handles quoted
values subtly differently from the canonical parser in `skill.ts`. Bug
fixes in one don't apply to the other.

## What Changes

The change is a structural refactor with **no behavioral change**. The
public API exposed via `package.json#exports` MUST remain stable; only
internal organization moves.

- Introduce three new modules under `src/`:
  - `lockfile.ts` — `normalizeLockfile`, `getLockfileSources`,
    `normalizeSyncHistory`, `dedupeSources`, `toLockfileSource`,
    `parseCatalogSource`, the `PLACEHOLDER_REPOS` constant, and the
    `LegacyLockfileState` migration union.
  - `direct-github.ts` — `parseDirectGitHubRef`, `parseGitHubSource`,
    `fetchDirectGitHubSkill`, `downloadDirectGitHubSkill`,
    `normalizeDirectManifest`, `confirmDirectInstall`.
  - `auto-sync.ts` — `maybeAutoSync`, `maybeSyncAfterRemove`,
    `resolveSyncAdapterIds`.
- Extract the shared file-download body from both downloaders into a
  single helper `downloadSkillFiles({ repo, ref, skillRelPath, files,
  targetDir })` exposed from a new `src/downloader.ts`.
- Consolidate frontmatter parsing: `catalog.ts` MUST call
  `parseSkillFrontmatter` from `skill.ts` instead of carrying its own
  inline parser. The duplicated helpers in `catalog.ts:320-351` are
  removed.
- `install.ts` shrinks to just `installSkills`, `updateSkills`,
  `removeSkill`, and the local `init` helper, re-exporting the moved
  symbols where the public `package.json#exports` requires them so no
  consumer breaks.
- Tests stay green; no test files move (tests can keep importing from
  `install.ts` because the re-export shim preserves the surface).

A `design.md` accompanies this change because it touches multiple
modules, has a re-export compatibility surface to preserve, and needs a
documented migration order.

## Impact

- Affected specs:
  - `install` — internal organization requirement (responsibilities split
    across modules) and the consolidation of frontmatter parsing
- Affected code (rename / move only):
  - `src/install.ts` (split source)
  - `src/lockfile.ts` (new)
  - `src/direct-github.ts` (new)
  - `src/auto-sync.ts` (new)
  - `src/downloader.ts` (new)
  - `src/catalog.ts` (delete duplicated frontmatter helpers)
  - `src/skill.ts` (export `parseSkillFrontmatter` if not already
    public)
  - `package.json#exports` — verify the existing entries
    (`./adapters`, `./catalog`, `./cli`, `./config`, `./fs`, `./http`,
    `./install`, `./sync`, `./types`) still resolve; no new entries
    are added in this change
- No public API breaks; no behavior change.
