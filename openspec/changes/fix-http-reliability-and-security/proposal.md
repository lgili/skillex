## Why

A code review identified one critical reliability bug, one critical
performance bug, and several security gaps in the HTTP, install, and sync
layers that block production use:

- `src/http.ts` has no request timeout, so any slow GitHub mirror hangs
  `skillex install` indefinitely (no progress, no abort).
- `downloadSkill` and `downloadDirectGitHubSkill` fetch each file in a skill
  sequentially; an 8-file skill costs 8 round trips.
- The `Authorization: Bearer ${GITHUB_TOKEN}` header is sent to **any** URL
  passed through the HTTP helpers — a future `--catalog-url` or third-party
  source would leak the token.
- `~/.askillrc.json` (which may contain `githubToken`) is written with the
  default umask (typically world-readable `0644`).
- `removeSkill` trusts `metadata.path` from the lockfile without
  `assertSafeRelativePath`, so a tampered lockfile can wipe arbitrary
  directories.
- `createSymlink` will point the link at any absolute target, so a tampered
  lockfile can cause `.claude/skills/foo` to symlink into the user's home.
- `parseDirectGitHubRef` accepts arbitrary characters in the ref portion;
  the value is later embedded in lockfile strings, opening room for
  shell-context injection in user automation.
- `maybeSyncAfterRemove` loops over adapters sequentially and overwrites
  `result` each iteration, returning only the last adapter's outcome;
  multi-adapter workspaces silently lose sync data.
- `toLockfileSource` contains a duplicated boolean expression
  (`(label || ...) && (label || ...)`) — a copy-paste bug that happens to
  work but is unreadable.
- `http.ts:121` collapses HTTP 403 rate-limit and 401/403 auth failures
  into one message; users cannot tell which to fix.
- `toInstallError` rewraps every non-Skillex error into a generic
  `INSTALL_ERROR`, losing original `error.code` (EACCES, ENOENT, …).

## What Changes

- **BREAKING (behavioral):** All HTTP requests now abort after a default
  30-second timeout (configurable per call). Long network hangs become
  fast failures instead of frozen processes.
- All file fetches inside a skill download are issued in parallel via
  `Promise.all`; skill directory writes now scale with network bandwidth
  rather than file count.
- `Authorization: Bearer` is only attached when the request host is
  `api.github.com`, `raw.githubusercontent.com`, or another
  `*.githubusercontent.com` mirror.
- `~/.askillrc.json` is written with mode `0o600` (owner read/write only).
- `removeSkill` validates `metadata.path` with `assertSafeRelativePath`
  before unlinking, and rejects any path that escapes the managed skills
  store.
- `createSymlink` validates that the link target is inside the managed
  skills store before creating the link.
- `parseDirectGitHubRef` enforces `^[A-Za-z0-9_.\-/]+$` for the ref segment
  and rejects anything else with a descriptive error.
- `maybeSyncAfterRemove` runs adapter syncs in parallel and aggregates
  results so callers can report each adapter's outcome.
- `toLockfileSource` simplifies the dedupe expression and is covered by a
  regression test.
- HTTP 403 responses are split: rate-limit is reported with the
  `X-RateLimit-Reset` hint; auth failures are reported separately with
  guidance to re-check `GITHUB_TOKEN`.
- `toInstallError` preserves the original `error.code` when present and
  surfaces it in the formatted message.

## Impact

- Affected specs:
  - `utilities` — HTTP timeouts, host-restricted Authorization header,
    file-mode 0600 for user config, symlink target validation
  - `install` — parallel file downloads, lockfile-path safety,
    ref-character validation, lockfile-dedupe correctness, error-code
    preservation, multi-adapter remove sync
  - `sync` — multi-adapter aggregation when called from remove flow
- Affected code:
  - `src/http.ts` (`fetchJson`, `fetchText`, `withDefaultHeaders`)
  - `src/fs.ts` (`createSymlink`)
  - `src/user-config.ts` (`writeUserConfig`)
  - `src/install.ts` (`downloadSkill`, `downloadDirectGitHubSkill`,
    `removeSkill`, `parseDirectGitHubRef`, `maybeSyncAfterRemove`,
    `toLockfileSource`, `toInstallError`)
  - `test/install.test.ts`, `test/fs.test.ts`, new `test/http.test.ts`
