## ADDED Requirements

### Requirement: Aggregate Sync Result for Multi-Adapter Workspaces

The sync implementation MUST return an aggregate result containing one entry per adapter when invoked across multiple detected adapters (such as from `maybeSyncAfterRemove` or auto-sync after install) rather than overwriting a shared variable in a sequential loop.

#### Scenario: Auto-sync after remove returns one result per adapter

- **WHEN** a workspace has `claude` and `codex` detected and the user
  removes a skill
- **THEN** the returned aggregate exposes a result entry for each adapter
- **AND** none of the per-adapter entries are dropped

#### Scenario: A failure in one adapter does not hide the others

- **WHEN** `claude` succeeds and `codex` fails during a multi-adapter
  sync
- **THEN** the aggregate result includes the success for `claude`
- **AND** includes the failure for `codex` with its error code
- **AND** the CLI prints both outcomes
