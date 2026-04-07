## 1. Build Infrastructure
- [x] 1.1 Add `typescript` and `@types/node` to `devDependencies` in `package.json`
- [x] 1.2 Create `tsconfig.json` with `strict: true`, `module: NodeNext`, `moduleResolution: NodeNext`, `outDir: dist`, `declaration: true`
- [x] 1.3 Add `"build": "tsc"` and `"typecheck": "tsc --noEmit"` scripts to `package.json`
- [x] 1.4 Update `prepublishOnly` to run `npm run build && npm test`
- [x] 1.5 Add `dist/` to `.gitignore`
- [x] 1.6 Update `package.json` `files` to `["bin", "dist", "README.md"]`
- [x] 1.7 Update `bin/skillex.js` shebang file to import from `../dist/cli.js`

## 2. Shared Types (`src/types.ts`)
- [x] 2.1 Define `AdapterConfig`, `AdapterState`, `SyncTarget`, `SyncResult`, `SyncPreview`, `SyncOptions` interfaces
- [x] 2.2 Define `SkillManifest`, `CatalogSource`, `CatalogEntry`, `SearchOptions` interfaces
- [x] 2.3 Define `LockfileState`, `InstalledSkill`, `LockfileCatalog`, `LockfileAdapters`, `LockfileSettings` interfaces
- [x] 2.4 Define `ParsedArgs`, `StatePaths` interfaces
- [x] 2.5 Define error classes: `CatalogError`, `InstallError`, `SyncError`, `ValidationError`, `AdapterNotFoundError`, `CliError` — each with a `code` field

## 3. Leaf Module Conversion
- [x] 3.1 Convert `src/config.js` → `src/config.ts`; type `getStatePaths()` as returning `StatePaths`
- [x] 3.2 Convert `src/fs.js` → `src/fs.ts`; make `readJson` generic `readJson<T>`, type all functions, throw `ValidationError` in `assertSafeRelativePath`
- [x] 3.3 Convert `src/http.js` → `src/http.ts`; make `fetchJson<T>` and `fetchOptionalJson<T>` generic

## 4. Core Module Conversion
- [x] 4.1 Convert `src/adapters.js` → `src/adapters.ts`; return `AdapterConfig` / `AdapterState`, throw `AdapterNotFoundError`
- [x] 4.2 Convert `src/catalog.js` → `src/catalog.ts`; return `SkillManifest[]`, throw `CatalogError` on remote or parse failures
- [x] 4.3 Convert `src/install.js` → `src/install.ts`; return `LockfileState` / `InstalledSkill`, throw `InstallError` with typed `code`
- [x] 4.4 Convert `src/sync.js` → `src/sync.ts`; return `SyncResult[]` / `SyncPreview[]`, throw `SyncError`
- [x] 4.5 Convert `src/cli.js` → `src/cli.ts`; type argument parser as `ParsedArgs`, throw `CliError` for invalid commands

## 5. TSDoc Comments
- [x] 5.1 Add TSDoc to every exported function and type in `src/types.ts`
- [x] 5.2 Add TSDoc to every exported function in `src/adapters.ts`, `src/catalog.ts`, `src/install.ts`, `src/sync.ts`, `src/cli.ts`
- [x] 5.3 Add TSDoc to every exported function in `src/config.ts`, `src/fs.ts`, `src/http.ts`

## 6. Test Migration
- [x] 6.1 Convert `test/adapters.test.js` → `test/adapters.test.ts`
- [x] 6.2 Convert `test/catalog.test.js` → `test/catalog.test.ts`
- [x] 6.3 Convert `test/create-skills.test.js` → `test/create-skills.test.ts`
- [x] 6.4 Convert `test/fs.test.js` → `test/fs.test.ts`
- [x] 6.5 Convert `test/install.test.js` → `test/install.test.ts`
- [x] 6.6 Convert `test/sync.test.js` → `test/sync.test.ts`
- [x] 6.7 Confirm all tests pass: `npm test`

## 7. CI and Package Updates
- [x] 7.1 Add `typecheck` step to `.github/workflows/ci.yml` before the `test` step
- [x] 7.2 Update `package.json` `exports` map to add subpath exports pointing to `dist/`
- [x] 7.3 Run `npm pack --dry-run` and verify no `src/*.ts` files are included
- [x] 7.4 Run full validation: `tsc --noEmit && npm test`
