## ADDED Requirements

### Requirement: GITHUB_TOKEN Authentication
The HTTP client SHALL read the `GITHUB_TOKEN` environment variable and include it as an `Authorization: Bearer <token>` header on all GitHub API and raw content requests when the variable is present.

#### Scenario: Token is sent when GITHUB_TOKEN is set
- **WHEN** `GITHUB_TOKEN=ghp_abc123 askill list --repo owner/repo` is executed
- **THEN** every HTTP request to `api.github.com` or `raw.githubusercontent.com` includes the header `Authorization: Bearer ghp_abc123`

#### Scenario: Requests proceed without token
- **WHEN** `GITHUB_TOKEN` is not set in the environment
- **THEN** requests proceed without an `Authorization` header and the unauthenticated rate limit applies

#### Scenario: --verbose logs token presence
- **WHEN** `askill list --verbose` is executed with `GITHUB_TOKEN` set
- **THEN** a `[debug]` line indicates "Using GITHUB_TOKEN for authentication"

### Requirement: Actionable HTTP Error Messages
HTTP errors returned by GitHub APIs SHALL produce error messages that state the likely cause and suggest a concrete corrective action, replacing generic status-code strings.

#### Scenario: 403 response suggests token
- **WHEN** a GitHub API request returns HTTP 403
- **THEN** the error message reads "GitHub API rate limit exceeded or access denied. Set the GITHUB_TOKEN environment variable to authenticate."

#### Scenario: 404 response suggests repo check
- **WHEN** a GitHub API request returns HTTP 404
- **THEN** the error message reads "Repository or file not found. Check that --repo is correct and the repository is public."

#### Scenario: 5xx response shows server error
- **WHEN** a GitHub API request returns HTTP 500 or 503
- **THEN** the error message reads "GitHub API returned a server error (<status>). Try again in a moment."

### Requirement: Local Catalog Cache
The CLI SHALL cache the loaded skill catalog to `.agent-skills/.cache/<source-hash>.json` with a 5-minute TTL to avoid redundant network requests across consecutive commands in the same session.

#### Scenario: Cache hit avoids network call
- **WHEN** `askill list` is run twice within 5 minutes on the same repo
- **THEN** the second invocation reads from the cache file and makes no HTTP request to the catalog source

#### Scenario: Expired cache triggers network refresh
- **WHEN** the cache file exists but its `expiresAt` timestamp is in the past
- **THEN** the CLI fetches the catalog from the network and overwrites the cache file with a new `expiresAt`

#### Scenario: --no-cache bypasses cache unconditionally
- **WHEN** `askill list --no-cache` is executed regardless of cache state
- **THEN** the CLI fetches the catalog from the network and updates the cache file

#### Scenario: --verbose reports cache status
- **WHEN** `askill list --verbose` is executed
- **THEN** a `[debug]` line reports either "Cache hit (expires in Xm Ys)" or "Cache miss — fetching from network"
