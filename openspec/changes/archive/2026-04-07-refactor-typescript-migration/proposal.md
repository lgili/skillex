## Why
The library is written in plain JavaScript with no type information, making it error-prone and hard to maintain as the number of adapters, skill formats, and CLI commands grows. Converting to TypeScript adds static type checking, self-documenting contracts, and IDE autocomplete across all eight source modules, significantly raising code quality and contributor experience.

## What Changes
- Convert all `src/*.js` files to `src/*.ts`
- Convert `bin/skillex.js` entry point to reference compiled output in `dist/`
- Add `tsconfig.json` with strict mode and `NodeNext` module resolution
- Add `typescript` and `@types/node` as dev dependencies
- Add `build` and `typecheck` npm scripts; `prepublishOnly` runs `build` then `test`
- Create `src/types.ts` with all shared interfaces and named error classes
- Add TSDoc comments to every exported function and type
- Convert all `test/*.test.js` files to `test/*.test.ts`
- Update `package.json` `files` to publish `dist/` instead of raw `src/`
- **BREAKING**: Package now ships compiled `.js` + `.d.ts` declaration files instead of raw source; any consumer importing from `src/` directly must update their import paths to `dist/`

## Impact
- Affected capabilities: `typescript-build`, `adapters`, `catalog`, `install`, `sync`, `cli`, `utilities`
- Affected code: all files in `src/`, `bin/`, `test/`, `package.json`, `.github/workflows/ci.yml`
