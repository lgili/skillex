## MODIFIED Requirements
### Requirement: Symlink-Based Sync For Dedicated Adapter Files
Installed skills SHALL be stored in a managed store for the selected scope and materialized into adapter targets via symlink when possible.

#### Scenario: Directory-native adapter uses symlinked workspace skill directory
- **WHEN** `syncAdapterFiles()` runs for the `codex` adapter in local scope
- **THEN** `.codex/skills/<skill-id>` is a symlink to `.agent-skills/skills/<skill-id>`

#### Scenario: Directory-native adapter uses symlinked global skill directory
- **WHEN** `syncAdapterFiles()` runs for the `claude` adapter in global scope
- **THEN** `~/.claude/skills/<skill-id>` is a symlink to `~/.skillex/skills/<skill-id>`

#### Scenario: File-based adapters keep generated artifacts
- **WHEN** `syncAdapterFiles()` runs for a file-based adapter such as `cline`
- **THEN** the generated artifact continues to exist under `.agent-skills/generated/cline/`
- **AND** the adapter target path still points to that generated file

### Requirement: Symlink Fallback to Copy Mode
On platforms where `fs.symlink` fails with `EPERM` or `ENOTSUP`, the system SHALL fall back silently to direct writes, emit a warning to stderr, and record `"syncMode": "copy"` in the lockfile.

#### Scenario: Directory symlink failure falls back to recursive copy
- **WHEN** creating a symlink for `.codex/skills/<skill-id>` throws `EPERM`
- **THEN** the system copies the full skill directory instead
- **AND** a warning is printed to stderr describing the fallback
- **AND** `skills.json` records `"syncMode": "copy"`

### Requirement: Copy Mode Override Flag
The `sync` command SHALL accept a `--mode copy` flag to force direct writes regardless of platform symlink support, allowing users to opt out of symlinks permanently.

#### Scenario: --mode copy produces copied skill directories
- **WHEN** `skillex sync --adapter codex --mode copy` is executed on a platform that supports symlinks
- **THEN** installed skill directories are copied to `.codex/skills/<skill-id>/` instead of linked
- **AND** `skills.json` records `"syncMode": "copy"`
