# Contributing to Skillex

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Issues](#reporting-issues)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Messages](#commit-messages)
- [Adding Skills](#adding-skills)

---

## Code of Conduct

Be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## Reporting Issues

Before filing a bug, please:

1. Search existing [issues](https://github.com/lgili/skillex/issues) for duplicates.
2. Run `skillex doctor` and include the output in your report.
3. Include your Node.js version (`node --version`) and OS.

Use the issue templates when available:

- **Bug report** — for unexpected behaviour or crashes
- **Feature request** — for new capabilities or improvements
- **Documentation** — for missing or incorrect docs

---

## Development Setup

**Prerequisites**

- Node.js ≥ 20.0.0
- npm ≥ 10

**Clone and install**

```bash
git clone https://github.com/lgili/skillex.git
cd skillex
npm install
```

**Build**

```bash
npm run build          # compile src/ → dist/
npm run build:test     # compile test/ → .test-dist/
```

**Run tests**

```bash
npm test
```

**Run the CLI locally**

```bash
node bin/skillex.js --help
```

Or link it globally during development:

```bash
npm link
skillex --help
```

**TypeScript type-check only (no emit)**

```bash
npm run typecheck
```

---

## Making Changes

1. Fork the repository and create a branch from `main`:

   ```bash
   git checkout -b feat/my-improvement
   ```

2. Keep changes focused. One logical change per PR.

3. Add or update tests in `test/` for any new behaviour.

4. Run `npm test` and `npm run typecheck` before pushing. Both must pass.

5. For non-trivial changes, consider opening an issue first to discuss the approach.

### Language conventions

- All user-facing strings (CLI output, error messages, Web UI labels) MUST be in English. Internal identifiers, JSON keys, lockfile fields, and code comments may stay as needed.
- Route every user-visible message through the `output.*` helpers in `src/output.ts` (`info`, `success`, `warn`, `error`, `debug`). Do not call `console.log` / `console.error` for user output outside `bin/skillex.js` and `src/output.ts`.
- The canonical lexicon: **agent** (not "adapter" in user-facing copy — keep `--adapter` flag for compatibility), **workspace** / **user-global** (not "local" / "global" in headlines), **catalog source** then just **source**.
- A regression check (`scripts/check-language.mjs`, run as part of `npm test`) scans for common Portuguese tokens and fails CI on any unannotated hit. To opt out, add a trailing comment `// i18n-allow: <reason>` (or the HTML equivalent inside .vue files).

### Project Structure

```
src/           TypeScript source
  cli.ts       CLI entry point and argument parser
  catalog.ts   Remote catalog loading and caching
  install.ts   Workspace init, install, update, remove
  sync.ts      Adapter sync (managed-block and symlink)
  adapters.ts  Adapter detection and configuration
  http.ts      Fetch utilities with GitHub auth
  output.ts    Colored terminal output helpers
  user-config.ts  Global ~/.askillrc.json config
  types.ts     Shared TypeScript interfaces and errors
  config.ts    Compile-time constants (repo, paths)
  fs.ts        Filesystem helpers

test/          Test files (*.test.ts compiled to .test-dist/)
bin/           Executable entry point
dist/          Compiled output (generated, not committed)
openspec/      Change proposals and specs (internal planning)
skills/        Example / bundled skills
```

---

## Pull Request Guidelines

- Target the `main` branch.
- Fill in the PR template completely.
- Link the related issue with `Closes #<number>` if applicable.
- Ensure CI checks pass before requesting review.
- Keep PRs small and focused — large PRs take longer to review.
- Add an entry to `CHANGELOG.md` under `[Unreleased]`.

---

## Commit Messages

We use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

Examples:

```
feat(catalog): add disk cache with 5-minute TTL
fix(http): return actionable message on 403 rate limit
docs: add CONTRIBUTING guide
```

---

## Adding Skills

Skills live in the [skills catalog repository](https://github.com/lgili/skillex). To contribute a new skill:

1. Create a folder under `skills/<your-skill-id>/`.
2. Add a `SKILL.md` file (or `skill.json` manifest + content file).
3. Open a PR in the catalog repository, not this one.

Skill content guidelines:

- Keep instructions concise and actionable.
- Include `tags` to aid discoverability.
- Set `compatibility` to the adapters the skill has been tested with.
