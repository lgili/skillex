## ADDED Requirements

### Requirement: HTTP Request Timeout

The HTTP helpers MUST attach an `AbortSignal` with a default timeout of 30 seconds when the caller does not provide one. This applies to `fetchJson`, `fetchText`, `fetchOptionalJson`, and `fetchOptionalText` in `src/http.ts`. The default value MUST be overridable via a module-level `setDefaultHttpTimeoutMs` helper for tests and advanced configuration.

#### Scenario: Default timeout aborts a hanging request

- **WHEN** a fetch helper is called and the underlying `fetch` does not
  resolve within the default timeout
- **THEN** the helper rejects with an `HttpError` whose `code` is
  `HTTP_TIMEOUT`
- **AND** the error message includes the requested URL and timeout value

#### Scenario: Caller-provided signal takes precedence

- **WHEN** the caller passes `init.signal`
- **THEN** the helper does not attach a default timeout signal
- **AND** the caller's signal is forwarded to `fetch` unchanged

### Requirement: Host-Restricted GitHub Authorization Header

The HTTP helpers MUST attach the `Authorization: Bearer ${GITHUB_TOKEN}`
header only when the target host is `api.github.com`,
`raw.githubusercontent.com`, or any subdomain of `githubusercontent.com`.
For all other hosts, the header MUST be omitted even when `GITHUB_TOKEN`
is set in the environment.

#### Scenario: Token is sent to GitHub hosts

- **WHEN** `GITHUB_TOKEN` is set and a fetch helper is called against
  `https://api.github.com/repos/...`
- **THEN** the request includes `Authorization: Bearer <token>`

#### Scenario: Token is suppressed on non-GitHub hosts

- **WHEN** `GITHUB_TOKEN` is set and a fetch helper is called against
  `https://example.com/catalog.json`
- **THEN** the request does NOT include any `Authorization` header
- **AND** a `debug` line is logged stating the token was suppressed

### Requirement: Differentiated HTTP 403 Errors

When a GitHub response returns HTTP 403, the HTTP helpers MUST inspect the
`X-RateLimit-Remaining` header to differentiate rate-limit failures from
authentication failures, raising distinct error codes.

#### Scenario: Rate limit exceeded

- **WHEN** a 403 response includes `X-RateLimit-Remaining: 0`
- **THEN** an `HttpError` is raised with code `HTTP_RATE_LIMIT`
- **AND** the message includes the reset time from `X-RateLimit-Reset`

#### Scenario: Authentication failure

- **WHEN** a 403 (or 401) response includes `X-RateLimit-Remaining` greater
  than zero, or the header is absent
- **THEN** an `HttpError` is raised with code `HTTP_AUTH_FAILED`
- **AND** the message instructs the user to verify `GITHUB_TOKEN`

### Requirement: User Config File Permissions

`writeUserConfig` MUST persist `~/.askillrc.json` with file mode `0o600`
so that any stored `githubToken` is not world-readable. When an existing
file is detected with looser permissions, the writer MUST tighten the
mode on save and emit a one-time warning during the session.

#### Scenario: New config file is created with mode 0600

- **WHEN** `writeUserConfig` writes a new `~/.askillrc.json`
- **THEN** the resulting file's permission bits mask to `0o600`

#### Scenario: Existing world-readable config is tightened

- **WHEN** `writeUserConfig` overwrites an existing config that was
  previously created with mode `0o644`
- **THEN** the file is rewritten with mode `0o600`
- **AND** a warning is printed once stating the file permissions were
  tightened

### Requirement: Symlink Target Confinement

`createSymlink` MUST accept an optional `allowedRoot` parameter and refuse
to create a symlink whose resolved target lies outside that root. Sync code
that creates per-skill symlinks MUST pass the managed skills store path as
`allowedRoot`.

#### Scenario: Target outside the allowed root is rejected

- **WHEN** `createSymlink({ target: "/etc/passwd", linkPath: "...", allowedRoot: ".../skills" })` is called
- **THEN** the call rejects with an error whose code identifies the
  unsafe path
- **AND** no symlink is created on disk

#### Scenario: Target inside the allowed root is created

- **WHEN** the resolved target lies within `allowedRoot`
- **THEN** the symlink is created normally
