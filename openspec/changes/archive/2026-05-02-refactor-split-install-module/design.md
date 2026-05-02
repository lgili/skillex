## Context

`src/install.ts` accumulated responsibilities organically as features
landed (multi-source catalogs, direct-github install, auto-sync,
lockfile migration). It now mixes seven distinct concerns in one file
and harbors a 95 %-duplicated downloader pair. The codebase has good
test coverage but each new feature requires touching a 1326-line file,
which slows changes and increases regression risk.

Constraints:

- The package exposes a granular `exports` map via `package.json`. The
  most-imported entry from outside (`./install`) MUST keep its current
  shape so library consumers (and existing tests) don't break.
- This refactor MUST land before, or in parallel with, the
  reliability / security change (`fix-http-reliability-and-security`)
  that touches several of the same functions; landing the refactor
  first reduces merge complexity.
- The frontmatter-parser consolidation also removes a known bug source
  (subtly different quoted-value handling) — kept inside this change to
  pay down the same kind of debt with one PR.

## Goals / Non-Goals

Goals:

- Reduce `install.ts` to the install / update / remove orchestration
  only.
- Eliminate the duplicated downloader.
- Eliminate the duplicated frontmatter parser.
- Preserve every public export currently consumed via
  `package.json#exports` and every test import path.
- Zero behavior change observable to end users.

Non-Goals:

- New features (recommended pack, doctor parity, language pass) — those
  are separate changes.
- API redesign (introducing new entry points or breaking signatures).
- Test reorganization. Tests stay where they are and continue to import
  from `install.ts` via re-exports.

## Decisions

- **Decision: Re-export from `install.ts`** — Functions moved to
  `lockfile.ts`, `direct-github.ts`, `auto-sync.ts` are re-exported
  from `install.ts` to keep the public surface stable.

  Alternatives considered:
    - Add a new `./lockfile`, `./direct-github`, `./auto-sync` entry to
      `package.json#exports`. Rejected for this change: every new entry
      is a future maintenance commitment and we have no third-party
      consumer asking for them yet.
    - Force callers to update import paths. Rejected: breaks downstream
      tests and any external library consumer mid-cycle.

- **Decision: Single `downloadSkillFiles` helper in `downloader.ts`** —
  Both catalog and direct-github paths call the same helper with their
  resolved `repo`, `ref`, `skillRelPath`, `files`, `targetDir`. Each
  caller still composes its own manifest (the catalog version uses the
  manifest from the catalog index; the direct version reads the
  remote `skill.json` first), but the file-fetch loop is shared.

- **Decision: `parseSkillFrontmatter` stays in `skill.ts` and becomes
  the single entry point** — `catalog.ts` calls it; the inline helpers
  there are deleted.

## Risks / Trade-offs

- **Risk: Hidden behavior drift between the two downloaders gets
  flattened, exposing latent bugs.**
  - Mitigation: keep the existing tests and add three integration tests
    that snapshot the resulting `skill.json` and file list for both
    catalog and direct paths, asserting they match expectations
    pre- and post-refactor.

- **Risk: Re-exports create a leaky abstraction (callers can still
  reach for `install.ts` for unrelated symbols).**
  - Mitigation: add a brief comment block in `install.ts` documenting
    the re-export shim and pointing to canonical modules. Future
    cleanup can remove the shim once no test imports rely on it.

- **Risk: Subtly different frontmatter parsing changes a corner case in
  catalog ingestion.**
  - Mitigation: add a focused test in `test/catalog.test.ts` that
    exercises quoted values, multi-line values, and values with `:`
    in them, asserting parity with `parseSkillFrontmatter`.

## Migration Plan

Sequenced, single PR:

1. Land `src/downloader.ts` with `downloadSkillFiles` and update both
   call sites in `install.ts`. Run tests.
2. Land `src/lockfile.ts`; move helpers; re-export from `install.ts`.
   Run tests.
3. Land `src/direct-github.ts`; move helpers; re-export from
   `install.ts`. Run tests.
4. Land `src/auto-sync.ts`; move helpers; re-export from
   `install.ts`. Run tests.
5. Replace `extractSkillMetadata` / `extractFrontmatterValue` in
   `catalog.ts` with calls to `parseSkillFrontmatter` from
   `skill.ts`. Add the parity test. Run tests.
6. Add the documentation note inside `install.ts` describing the
   re-export shim.

Rollback: revert the single PR. No data on disk changes; no lockfile
schema changes.

## Open Questions

- Should `direct-github.ts` eventually grow a `pluggable VCS provider`
  abstraction (so we can add GitLab, Codeberg)? Out of scope here, but
  the file boundary makes it cheaper to introduce later.
- Should `auto-sync.ts` consume an injected `syncAdapterFiles` (it
  currently calls into `sync.ts` directly)? Worth considering if we
  ever want a `--no-sync` global flag, but not in scope here.
