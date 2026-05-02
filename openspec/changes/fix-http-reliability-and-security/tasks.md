## 1. HTTP timeouts and host-restricted authorization

- [ ] 1.1 Introduce a configurable `defaultHttpTimeoutMs` (default 30000) in `src/http.ts` and apply it via `AbortSignal.timeout` whenever the caller does not pass `init.signal`.
- [ ] 1.2 Wrap `fetchJson`, `fetchText`, `fetchOptionalJson`, and `fetchOptionalText` so timeout errors raise a typed `HttpError` with `code: "HTTP_TIMEOUT"` and the URL.
- [ ] 1.3 Restrict the `Authorization: Bearer` header to hosts matching `api.github.com`, `raw.githubusercontent.com`, or `*.githubusercontent.com`; log a `debug` line when the token is intentionally suppressed for a non-GitHub host.
- [ ] 1.4 Add tests in `test/http.test.ts` covering: timeout abort, 403 rate-limit vs 401/403 auth split, non-GitHub host with token set (must NOT include header).

## 2. Parallel file downloads

- [ ] 2.1 In `src/install.ts` `downloadSkill`, replace the per-file `for` loop with `await Promise.all(skill.files.map(...))`.
- [ ] 2.2 Apply the same change in `downloadDirectGitHubSkill`.
- [ ] 2.3 Extract the shared body into a `downloadSkillFiles({ repo, ref, skillRelPath, files, targetDir })` helper used by both call sites.
- [ ] 2.4 Add a regression test in `test/install.test.ts` asserting that two skills with three files each issue six concurrent fetches via the injected downloader spy.

## 3. Lockfile-path and symlink-target safety

- [ ] 3.1 In `src/fs.ts` `createSymlink`, accept an optional `allowedRoot` parameter and reject targets that resolve outside it.
- [ ] 3.2 In `src/install.ts` `removeSkill`, run `assertSafeRelativePath(metadata.path, statePaths.skillsDirPath)` before any `removePath` call.
- [ ] 3.3 Update the sync code path that creates per-skill symlinks to pass `statePaths.skillsDirPath` as `allowedRoot`.
- [ ] 3.4 Add tests covering tampered lockfile paths (e.g. `path: "../../etc/passwd"`) and symlink targets outside the store.

## 4. Direct-install ref validation

- [ ] 4.1 In `parseDirectGitHubRef`, validate the ref segment against `/^[A-Za-z0-9_.\-/]+$/` and throw `CliError` with code `INVALID_DIRECT_REF` and the offending value when it fails.
- [ ] 4.2 Reject empty ref after `@` (currently silently falls back to `main`).
- [ ] 4.3 Add tests for valid refs, empty refs, refs with newlines, and refs with shell metacharacters.

## 5. User-config file mode

- [ ] 5.1 In `src/user-config.ts` `writeUserConfig`, pass `{ mode: 0o600 }` to `fs.writeFile`.
- [ ] 5.2 If the file already exists with looser permissions, call `fs.chmod` to tighten on next write; emit a `warn` once per session if previously world-readable.
- [ ] 5.3 Add a test using `fs.stat` to assert the resulting mode masks to `0o600`.

## 6. Multi-adapter remove sync aggregation

- [ ] 6.1 Refactor `maybeSyncAfterRemove` in `src/install.ts` to call `Promise.all` over adapters and return `SyncMetadata[]` instead of a single result.
- [ ] 6.2 Update the CLI handler to print one line per adapter (consistent with `install` auto-sync output).
- [ ] 6.3 Add a multi-adapter test asserting both adapters are present in the returned aggregate.

## 7. Lockfile dedup expression and error-code preservation

- [ ] 7.1 Replace the duplicated boolean in `toLockfileSource` with a clearly named `wantsLabel` boolean.
- [ ] 7.2 In `toInstallError`, preserve `(error as NodeJS.ErrnoException).code` when present and append it to the formatted message.
- [ ] 7.3 Distinguish HTTP 403 rate-limit from 401/403 auth in `src/http.ts` using `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers; emit two separate `HttpError` codes (`HTTP_RATE_LIMIT`, `HTTP_AUTH_FAILED`).
- [ ] 7.4 Tests covering each error path.

## 8. Documentation and changelog

- [ ] 8.1 Document the new `defaultHttpTimeoutMs` and `--timeout-ms` (if exposed) in `README.md` Troubleshooting.
- [ ] 8.2 Add a `CHANGELOG.md` entry under `[Unreleased]` summarizing the security and reliability fixes.
