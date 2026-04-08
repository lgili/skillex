## Context
The repository already stores installed skills as full directories under `.agent-skills/skills/<skill-id>/`. The mismatch happens at exposure time: directory-native adapters currently receive one generated markdown file instead of a native skill directory tree. The user also wants a global install path so an agent can access the same skills in every workspace, similar to `~/.codex/skills`.

The workspace currently contains experiments in `.codex/skills/` and `.claude/skills/`, which confirms the product direction has shifted away from consolidated markdown files and toward native skill directories.

## Goals / Non-Goals
- Goals:
  - Support `local` and `global` installation scopes
  - Materialize directory-native adapters as one directory per installed skill
  - Preserve full multi-file skill contents (`SKILL.md`, `scripts/`, `references/`, `assets/`, `agents/`)
  - Keep a single managed store per scope and expose it through symlinks by default
  - Maintain compatibility for block/file-based adapters without redesigning their formats
- Non-Goals:
  - Replacing every adapter with a directory-native model in one change
  - Removing `.agent-skills/` as the local source of truth
  - Changing the catalog format for repository authors
  - Defining agent-specific global locations for adapters that do not yet have a clear skills-directory convention

## Decisions

- **Two state roots, one model**
  - Local scope keeps using `.agent-skills/` inside the current workspace.
  - Global scope uses `~/.skillex/`.
  - Both scopes keep the same internal shape: `skills.json` plus `skills/<skill-id>/`.
  - Commands read and write exactly one scope at a time.

- **CLI scope selection**
  - Add `--scope local|global` to `init`, `install`, `update`, `remove`, `sync`, and `status`.
  - Add `--global` as sugar for `--scope global`.
  - Default remains `local`.

- **Directory-native adapters use managed directories**
  - Extend adapter config with a new sync mode: `managed-directory`.
  - `codex`, `claude`, and `gemini` move to this mode.
  - Their local targets are `.codex/skills/`, `.claude/skills/`, and `.gemini/skills/`.
  - Their global targets are `~/.codex/skills/`, `~/.claude/skills/`, and `~/.gemini/skills/`.
  - Sync creates one directory entry per installed skill: `<skill-root>/<skill-id>/`.

- **Materialization strategy**
  - The managed store remains the source of truth: `.agent-skills/skills/<skill-id>/` for local, `~/.skillex/skills/<skill-id>/` for global.
  - `sync` creates relative symlinks from the adapter skill root to the managed store when possible.
  - `--mode copy` remains supported and copies full directories recursively.
  - On `EPERM` or `ENOTSUP`, the system falls back to recursive copy and records `"syncMode": "copy"`.

- **Legacy cleanup**
  - When syncing a directory-native adapter, Skillex removes legacy aggregate files such as `skillex-skills.md` and `askill-skills.md` from that adapter's skill root.
  - The migration is one-way for these adapters. The aggregate file is no longer considered the canonical target.

- **Scope-aware initialization**
  - `skillex init` continues to prepare local state.
  - `skillex init --global --adapter <id>` prepares global state and records a global active adapter.
  - Mutating global commands may lazily create `~/.skillex/skills.json`, but `sync --global` without a known global adapter should fail with a clear instruction to run `init --global --adapter <id>` or pass `--adapter`.

- **Adapters without skill directories stay file-based**
  - `copilot` remains managed-block.
  - `cline`, `cursor`, and `windsurf` remain managed-file.
  - Their current workspace behavior stays unchanged in this change.
  - Global sync for these adapters is explicitly out of scope until their stable global paths are defined.

## Alternatives Considered
- **Install directly into adapter directories without a managed store**
  - Rejected. It would make updates, source tracking, and removal harder, especially when the same skill exists in multiple catalogs.
- **Flatten each skill to a single markdown file per skill**
  - Rejected. It discards scripts, references, assets, and agent metadata, which is exactly the limitation the change is intended to remove.
- **Use one shared global store only and drop local installs**
  - Rejected. Workspace-local skills remain important for team repositories and project-specific behavior.

## Risks / Trade-offs
- **Breaking output paths for existing Codex/Claude/Gemini users**
  - Mitigation: clean up legacy files automatically and document the migration clearly.
- **Global scope introduces another state root**
  - Mitigation: keep the lockfile schema identical between local and global scopes and make scope explicit in CLI output.
- **Directory symlink behavior on Windows**
  - Mitigation: keep the existing copy fallback and extend it to recursive directory copies.

## Migration Plan
1. Extend typed config and adapter metadata to understand scoped state roots and directory-based adapters.
2. Update installer/state operations to target `.agent-skills/` or `~/.skillex/` based on scope.
3. Update sync to materialize full skill directories for `codex`, `claude`, and `gemini`.
4. Remove legacy aggregated files when a directory-native adapter sync succeeds.
5. Update CLI help, README, and status output for local/global scope.
6. Update tests to cover local/global installs, directory symlinks, recursive copy fallback, and legacy cleanup.
