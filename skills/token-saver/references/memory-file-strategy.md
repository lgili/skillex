# Memory File Strategy

> Reference for: token-saver
> Load when: Rewriting AGENTS.md, CLAUDE.md, GEMINI.md, or agent rules files

## Overview

Persistent memory files cost tokens every session or on every activation path. Treat them like
high-rent context: only durable defaults belong there.

## Key Concepts

### Keep only durable instructions

Good candidates:

- coding standards that apply across the whole repo
- validation requirements
- security constraints
- response style defaults
- deployment or release invariants

Bad candidates:

- temporary TODO lists
- one-off debugging notes
- copied docs the agent can look up when needed
- large architectural narratives with no operational value

### Separate always-on from on-demand

Use the persistent memory file for compact defaults, and move deep detail to:

- dedicated repo docs
- specialized skill references
- issue or task-specific notes

### Recommended memory shape

```markdown
# Project Memory

## Mission
- One durable statement.

## Defaults
- Response style.
- Validation defaults.

## Constraints
- Hard rules only.

## Workflow
- How to approach work.
```

## Examples

Poor section:

```markdown
## Background
This project originally started in 2019 as an internal effort to explore...
```

Better:

```markdown
## Mission
- Maintain stable simulation and reporting tooling for converter design.
```

## Anti-Patterns

- Putting full onboarding docs into `AGENTS.md`.
- Duplicating the same rule in multiple sections.
- Keeping repeated "be careful", "be concise", "be accurate" prose when one bullet is enough.
- Storing secrets, tokens, or credentials in any memory/rules file.
