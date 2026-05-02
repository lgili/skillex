## ADDED Requirements

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
