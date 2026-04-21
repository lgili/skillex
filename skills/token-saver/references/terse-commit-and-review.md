# Terse Commit And Review

> Reference for: token-saver
> Load when: Writing short commit messages or compact review comments

## Overview

Two repetitive outputs often waste tokens: commit messages that narrate the diff and review
comments that spend more words on tone than on the issue. Compress them hard, but keep the
decision and action intact.

## Key Concepts

### Commits

- Use Conventional Commits.
- Keep the subject short and reason-focused.
- Add a body only when the why is not obvious.

Good:

```text
fix(sync): clean stale adapter symlinks
```

Too long:

```text
fix(sync): remove stale symlinks that were left behind when users removed installed skills from the local workspace
```

### Reviews

- One finding = one line.
- Include line or location context when possible.
- Say the problem and the fix direction.

Good:

```text
L42 bug: `user` may be null. Guard before dereference.
```

Bad:

```text
I think there may potentially be a problem here because if the user object is null this code could throw, so maybe consider adding a check.
```

## Examples

```text
L118 risk: timeout parsed as ms in one path, seconds in another. Normalize units.
L77 q: should this config fall back to workspace scope when global is missing?
LGTM
```

## Anti-Patterns

- Repeating the diff in the commit body.
- Praise-only review comments on routine code.
- Vague review comments without severity or action.
- Review comments that quote large code blocks when a location and short diagnosis are enough.
