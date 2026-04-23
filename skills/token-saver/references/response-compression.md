# Response Compression

> Reference for: token-saver
> Load when: Making answers shorter while preserving technical correctness

## Overview

Good compression removes redundancy, not meaning. The best compact answer keeps the same
technical nouns, commands, formulas, and constraints while deleting filler, greetings,
hedging, and narration that does not change the decision.

## Key Concepts

### Lead with the answer

If the user asked a binary or directional question, answer that first.

Good:

```text
Yes. Use the global scope for this.
```

Bad:

```text
There are a few tradeoffs to consider here, but broadly speaking, this can be a good option.
```

### Prefer dense structure over prose

Use bullets, tables, equations, short numbered steps, or short labeled blocks when they carry
the information faster than a paragraph.

Good:

```text
- Cause: token file loaded every session.
- Fix: move ephemeral notes out of CLAUDE.md.
- Result: lower steady-state context cost.
```

### Keep exact technical anchors

Never compress away:

- commands
- file paths
- API names
- version numbers
- equations
- error strings
- config keys

## Examples

Verbose:

```text
The reason your build is failing is that the `NODE_ENV` variable is only being set in the local shell session and not in the CI environment, which means the configuration branch that expects production mode never gets enabled.
```

Compressed:

```text
Build fails because CI never sets `NODE_ENV=production`. Production config branch stays off.
```

## Anti-Patterns

- Compressing until the answer becomes cryptic.
- Removing safety warnings or migration steps to save a few tokens.
- Replacing exact names with vague pronouns like "it" or "that thing".
- Writing theatrically terse output that becomes harder to scan than the original.
