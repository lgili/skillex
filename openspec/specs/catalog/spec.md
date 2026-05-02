# catalog Specification

## Purpose
TBD - created by archiving change refactor-typescript-migration. Update Purpose after archive.
## Requirements
### Requirement: Typed Skill Manifest
Every skill retrieved from a catalog SHALL conform to the `SkillManifest` interface with required fields: `id: string`, `name: string`, `description: string`, `version: string`, `author: string | null`, `compatibility: string[]`, `entry: string`, `path: string`, and `files: string[]`.

#### Scenario: Catalog load returns typed skills
- **WHEN** `loadCatalog()` resolves
- **THEN** every skill in the returned catalog satisfies `SkillManifest`

#### Scenario: Malformed entry throws CatalogError
- **WHEN** a catalog entry is missing a required field such as `id`
- **THEN** `loadCatalog()` throws a `CatalogError` whose message identifies the malformed entry
- **AND** the error is not a generic `Error`

### Requirement: Typed Catalog Source
`resolveSource()` SHALL return a `CatalogSource` interface with typed fields `owner: string`, `repoName: string`, `repo: string`, `ref: string`, `catalogPath: string`, `skillsDir: string`, and `catalogUrl: string | null`.

#### Scenario: Source resolves with correct types
- **WHEN** a valid `"owner/repo"` string is passed to `resolveSource()`
- **THEN** the resolved object satisfies `CatalogSource`

#### Scenario: GitHub URL resolves with correct types
- **WHEN** a full GitHub URL is passed to `resolveSource()`
- **THEN** the resolved object satisfies `CatalogSource` with `owner` and `repo` extracted correctly

### Requirement: Typed Search Options
`searchCatalogSkills()` SHALL accept a `SearchOptions` typed parameter with optional `query?: string`, `compatibility?: string[] | string`, and `tags?: string[] | string` fields, and return `SkillManifest[]`.

#### Scenario: Typed compatibility filter returns matching skills
- **WHEN** `searchCatalogSkills(skills, { compatibility: ["claude"] })` is called
- **THEN** only skills whose `compatibility` array includes `"claude"` are returned
- **AND** TypeScript compilation rejects `SearchOptions` objects with undeclared fields

### Requirement: Catalog Load Error Handling
`loadCatalog()` SHALL throw a `CatalogError` with a descriptive message when the remote catalog is unreachable, returns a non-200 status, or contains malformed JSON.

#### Scenario: Network failure throws CatalogError
- **WHEN** the GitHub API request fails with a network error
- **THEN** `loadCatalog()` throws a `CatalogError` whose `message` describes the failure

### Requirement: TSDoc on Catalog Exports
Every exported function in `src/catalog.ts` SHALL have a TSDoc comment describing parameters, return type, and thrown errors.

#### Scenario: IDE shows documentation on hover
- **WHEN** a developer hovers over `loadCatalog` in a TypeScript-aware editor
- **THEN** the editor displays the TSDoc description and return type

### Requirement: Aggregate Skills Across Configured Sources

The system SHALL load and aggregate skills from every configured source in the current workspace when a command does not provide a `--repo` override.

#### Scenario: Aggregate skills from multiple sources

- **WHEN** the workspace lockfile contains more than one configured source
- **THEN** the catalog layer returns skills from every configured source
- **AND** preserves a stable source association for each returned skill

#### Scenario: Single-source override bypasses aggregation

- **WHEN** a command provides `--repo owner/repo`
- **THEN** the catalog layer loads only that source for the current operation
- **AND** does not require the override source to be persisted in the workspace lockfile

### Requirement: Preserve Source Identity For Duplicate Skill IDs

The system SHALL preserve source identity when multiple configured sources expose the same skill id.

#### Scenario: Duplicate ids remain distinguishable during aggregation

- **WHEN** two configured sources both publish a skill with id `code-review`
- **THEN** the aggregated catalog result includes both entries
- **AND** each entry retains its originating source metadata

### Requirement: Frontmatter and Manifest Category Extraction

The catalog loader MUST extract the optional `category` field both from `skill.json` manifests and from `SKILL.md` frontmatter (when the tree fallback path is used) and propagate it through the resulting `SkillManifest` and `CatalogResponse`.

#### Scenario: skill.json category propagates

- **WHEN** the catalog ingestion path normalizes a skill whose `skill.json` declares `category`
- **THEN** the resulting `SkillManifest.category` equals the declared value

#### Scenario: SKILL.md frontmatter category propagates

- **WHEN** the catalog tree-fallback path reads SKILL.md frontmatter and the frontmatter declares `category`
- **THEN** the resulting `SkillManifest.category` equals the parsed value

#### Scenario: Missing category leaves the field undefined

- **WHEN** neither the manifest nor the frontmatter declares `category`
- **THEN** `SkillManifest.category` is `undefined`
- **AND** the catalog response still validates and renders normally

