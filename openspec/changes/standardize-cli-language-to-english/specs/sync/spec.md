## ADDED Requirements

### Requirement: English Sync Warnings and Dry-Run Output

The sync subsystem MUST emit all user-visible warnings (symlink fallback, missing adapter, dry-run banner) in English and route them through `output.warn` / `output.info` instead of bare `console.error`.

#### Scenario: Symlink fallback warning is in English

- **WHEN** the platform does not support symlinks and sync falls back to copy
- **THEN** the printed warning is in English and recommends the explicit `--mode copy` flag for repeatability

#### Scenario: Dry-run banner is in English

- **WHEN** the user runs `skillex sync --dry-run`
- **THEN** the dry-run banner and per-adapter preview lines are in English
