## 1. Scoped State Infrastructure
- [x] 1.1 Add a typed install scope model (`local` and `global`) in `src/types.ts`
- [x] 1.2 Extend `src/config.ts` to resolve both workspace state paths and global state paths
- [x] 1.3 Update lockfile/state helpers in `src/install.ts` to read and write the selected scope without mutating the other one
- [x] 1.4 Add tests for local and global state path resolution and lockfile isolation

## 2. Adapter Model Updates
- [x] 2.1 Extend adapter definitions to support `managed-directory` targets and optional global target roots
- [x] 2.2 Move `codex`, `claude`, and `gemini` to directory-native sync targets
- [x] 2.3 Keep `copilot`, `cline`, `cursor`, and `windsurf` on their current block/file sync behavior
- [x] 2.4 Add tests covering adapter metadata and detection for directory-native adapters

## 3. Directory-Based Sync
- [x] 3.1 Update `syncAdapterFiles()` to materialize one directory per installed skill for `managed-directory` adapters
- [x] 3.2 Default to symlinking each skill directory from the managed store into the adapter skill root
- [x] 3.3 Extend `--mode copy` and fallback behavior to copy directories recursively
- [x] 3.4 Remove legacy `skillex-skills.md` and `askill-skills.md` files when a directory-native sync succeeds
- [x] 3.5 Add tests for local directory sync, global directory sync, recursive copy fallback, and legacy cleanup

## 4. CLI Scope Support
- [x] 4.1 Add `--scope local|global` and `--global` support to `init`, `install`, `update`, `remove`, `sync`, and `status`
- [x] 4.2 Make `status` clearly show which scope is being inspected and where its state root lives
- [x] 4.3 Ensure `sync --global` requires a known global adapter or an explicit `--adapter`
- [x] 4.4 Add tests for CLI scope parsing and global init/sync flows

## 5. Documentation
- [x] 5.1 Update README to explain local vs global installation
- [x] 5.2 Document the new directory-based sync layout for Codex, Claude, and Gemini
- [x] 5.3 Add migration notes from `skillex-skills.md` to `<agent>/skills/<skill-id>/`
