## ADDED Requirements

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
