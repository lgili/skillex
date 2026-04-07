## Context
`skillex` is a Node.js CLI tool (ESM, Node ≥ 20) that manages AI agent skills across adapters. It has eight source modules (`config`, `fs`, `http`, `adapters`, `catalog`, `install`, `sync`, `cli`) and no current type information. The migration is a cross-cutting refactor with no behavioral changes.

## Goals / Non-Goals
- Goals:
  - Full TypeScript strict mode coverage across all source modules
  - Generated `.d.ts` declaration files so downstream consumers get type safety
  - TSDoc on every exported symbol
  - All existing tests migrated and passing
  - Type-check step added to CI
- Non-Goals:
  - Changing any runtime behavior or public API signatures
  - Adding new features during this migration
  - Introducing a bundler or transpiler (plain `tsc` only)
  - Supporting Node.js versions below 20

## Decisions

- **Module resolution: `NodeNext`** — matches the existing `"type": "module"` package and enforces explicit `.js` extensions in imports, keeping ESM semantics intact without a bundler.
- **`outDir: dist/`** — compiled output is separate from source; `package.json` `exports` map points to `dist/`. Raw `.ts` source is excluded from the published artifact.
- **Strict mode enabled** — `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` to catch the broadest class of runtime bugs at compile time.
- **Plain `tsc`, no bundler** — `tsc` is sufficient for a Node.js CLI; avoids adding runtime complexity and keeps the build step reproducible.
- **Shared types in `src/types.ts`** — a single file for all interfaces and error classes prevents circular imports and gives contributors one canonical place to find data contracts.
- **Named error classes** — `CatalogError`, `InstallError`, `SyncError`, `ValidationError`, `AdapterNotFoundError`, `CliError` replace generic `Error` throws to enable precise `catch` branches in consumers and tests.
- **Migrate leaf modules first** — `config` → `fs` → `http` → `adapters` → `catalog` → `install` → `sync` → `cli` minimizes the number of untyped dependencies each converted module still imports.

## Alternatives Considered
- **`esbuild` / `tsup`** — faster builds but unnecessary complexity for a pure Node.js CLI; no tree-shaking or bundling needed. Rejected.
- **JSDoc type annotations** — avoids `.ts` files but provides no strict compiler enforcement and degrades refactoring support. Rejected.
- **Vitest instead of Node.js built-in test runner** — out of scope; swapping the test runner inflates diff and risk. Rejected.

## Risks / Trade-offs
- **BREAKING: `files` in `package.json` changes** — consumers who import directly from `src/` will break. Mitigation: publish a `exports` map so named subpaths continue to resolve against `dist/`.
- **Large diff** — migrating all modules at once makes review harder. Mitigation: commit module by module, ordered leaf-first per the migration sequence above.
- **`NodeNext` requires explicit `.js` extensions** — existing imports may need updating. These will surface as compile errors during migration and are fixed incrementally.

## Migration Plan
1. Add `typescript`, `@types/node`, `tsconfig.json`, and npm scripts — no source changes.
2. Create `src/types.ts` with all shared types and error classes.
3. Convert leaf modules: `config.ts` → `fs.ts` → `http.ts`.
4. Convert core modules: `adapters.ts` → `catalog.ts` → `install.ts` → `sync.ts` → `cli.ts`.
5. Convert tests: `test/*.test.ts`.
6. Update `package.json` `exports` / `files` and CI workflow.
7. Run `tsc --noEmit` and full test suite to confirm clean state.

## Open Questions
- Should `declarationMap: true` be enabled to allow source-level stepping in debuggers?
