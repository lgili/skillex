## ADDED Requirements

### Requirement: Recommended Skill List Module

The codebase MUST expose `RECOMMENDED_SKILL_IDS` from a single module (`src/recommended.ts`) so that any onboarding feature (init flag, future Web UI prompt, future `install --recommended` shorthand) reads from the same source of truth.

#### Scenario: Single source of truth

- **WHEN** any onboarding feature needs to install the recommended set
- **THEN** it imports from `src/recommended.ts`
- **AND** does not redefine the list inline

#### Scenario: List is documented

- **WHEN** the README "Quick Start" section is rendered
- **THEN** it links to or summarizes the curated starter pack so users know what they will get with `--install-recommended`
