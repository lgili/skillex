## ADDED Requirements

### Requirement: Optional Skill Category Field

The `SkillManifest` shape MUST accept an optional `category?: string` field so catalog publishers can group skills explicitly instead of relying on consumer-side inference. The field MUST be stored verbatim in the lockfile and forwarded by every catalog response.

#### Scenario: Manifest carries explicit category

- **WHEN** a `skill.json` declares `"category": "code"`
- **THEN** the parsed `SkillManifest` exposes `category: "code"`
- **AND** the catalog response forwards the same value

#### Scenario: Manifest omits category

- **WHEN** a `skill.json` does not declare `category`
- **THEN** the parsed `SkillManifest` has `category: undefined`
- **AND** consumers may apply their own inference
