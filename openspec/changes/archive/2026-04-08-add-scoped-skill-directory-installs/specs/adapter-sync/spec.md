## MODIFIED Requirements
### Requirement: Generate Adapter-Specific Files

The system SHALL materialize installed skills into the native targets expected by each adapter.

#### Scenario: Sync to Codex workspace skill directory

- **WHEN** the active adapter is `codex`
- **AND** the selected scope is `local`
- **THEN** the CLI creates `.codex/skills/<skill-id>/` for each installed skill
- **AND** each materialized skill directory contains the installed skill contents, including `SKILL.md`

#### Scenario: Sync to Codex global skill directory

- **WHEN** the active adapter is `codex`
- **AND** the selected scope is `global`
- **THEN** the CLI creates `~/.codex/skills/<skill-id>/` for each installed global skill

#### Scenario: Sync to Claude workspace skill directory

- **WHEN** the active adapter is `claude`
- **AND** the selected scope is `local`
- **THEN** the CLI creates `.claude/skills/<skill-id>/` for each installed skill

#### Scenario: Sync to Gemini workspace skill directory

- **WHEN** the active adapter is `gemini`
- **AND** the selected scope is `local`
- **THEN** the CLI creates `.gemini/skills/<skill-id>/` for each installed skill

#### Scenario: File-based adapters keep their current sync targets

- **WHEN** the active adapter is `copilot`
- **THEN** the CLI continues to update `.github/copilot-instructions.md`

## ADDED Requirements
### Requirement: Remove Legacy Aggregate Skill Files For Directory-Native Adapters

Skillex SHALL remove obsolete aggregate skill files when syncing adapters that now use native skill directories.

#### Scenario: Remove legacy Codex aggregate file

- **WHEN** `.codex/skills/skillex-skills.md` exists from an older Skillex version
- **AND** the user runs `skillex sync --adapter codex`
- **THEN** the CLI removes `.codex/skills/skillex-skills.md`
- **AND** the synced skills remain available through `.codex/skills/<skill-id>/`

#### Scenario: Remove legacy Claude aggregate file

- **WHEN** `.claude/skills/skillex-skills.md` exists from an older Skillex version
- **AND** the user runs `skillex sync --adapter claude`
- **THEN** the CLI removes `.claude/skills/skillex-skills.md`
