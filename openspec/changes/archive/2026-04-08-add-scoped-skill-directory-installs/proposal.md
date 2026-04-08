## Why
Skillex currently installs skills into a managed workspace store and then exposes them to AI agents primarily through aggregated markdown outputs such as `.codex/skills/skillex-skills.md`. That does not match how directory-native agents normally consume skills, where each skill is a folder with its own `SKILL.md`, scripts, references, and assets. It also prevents a first-class global install mode that makes skills available across every workspace.

## What Changes
- Add install and sync scopes: `local` for the current workspace and `global` for the current user.
- **BREAKING**: For directory-native adapters (`codex`, `claude`, `gemini`), replace the aggregated `skillex-skills.md` output with one materialized directory per installed skill under the adapter's `skills/` root.
- Add a global managed state under `~/.skillex/` so users can install skills once and expose them to agents globally.
- Keep block/file-based adapters (`copilot`, `cline`, `cursor`, `windsurf`) on the existing file-oriented sync model for now.
- Add migration behavior that cleans up legacy aggregated skill files for adapters that move to directory-based sync.

## Impact
- Affected capabilities: `install`, `skill-management-cli`, `adapter-sync`, `adapters`, `symlink-sync`
- Affected code: `src/install.ts`, `src/sync.ts`, `src/adapters.ts`, `src/config.ts`, `src/cli.ts`, `src/types.ts`, `src/user-config.ts`, README and tests
- Breaking:
  - `codex`, `claude`, and `gemini` no longer consume `skillex-skills.md` as their primary sync output
  - users must re-run `skillex sync` after upgrading so existing workspace/global installs are materialized into `<agent>/skills/<skill-id>/`
