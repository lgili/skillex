---
name: token-saver
description: Response compression and agent-memory trimming specialist for saving tokens without losing technical accuracy. Use when asked to be more concise, reduce verbosity, save tokens, compress AGENTS.md or CLAUDE.md style files, write terse commit messages, or produce one-line review comments. Trigger for asks like "save tokens", "be terse", "less verbose", "compress this memory file", "rewrite AGENTS.md shorter", "short commit message", or "one-line review".
---

# Token Saver

## Overview

Use this skill when the goal is to reduce token usage across replies, persistent agent memory
files, commit messages, and code review comments without dropping technical correctness.

This skill is inspired by the command patterns used in the `caveman` project, but translated
into a more professional, engineering-focused style: compact, direct, exact, and still readable.

## Core Workflow

1. **Choose the compression target** — Decide whether the user needs a terse reply, a compact memory file, a short commit message, or one-line review comments.
2. **Preserve technical signal** — Keep commands, code, file paths, version numbers, equations, API names, and error strings exact. Remove filler before removing content.
3. **Compress structure before meaning** — Lead with the conclusion, prefer bullets or short blocks over prose, and collapse repeated caveats or obvious restatements.
4. **Use specialist micro-formats** — For commits, use tight Conventional Commits. For reviews, give one line per finding with line or location context. For memory files, keep only durable instructions and defaults.
5. **Audit persistent token cost** — Use `scripts/token_report.js` to find heavy memory and rules files that are good compression targets.
6. **Generate compact scaffolds when needed** — Use `scripts/scaffold_compact_memory.js` to create lean `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or rule files that stay small from the start.

## Reference Guide

| Topic | Reference | When to load |
|---|---|---|
| Response compression patterns | `references/response-compression.md` | When making answers shorter while keeping substance |
| Memory and rules files | `references/memory-file-strategy.md` | When rewriting `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or agent rule files |
| Terse commits and reviews | `references/terse-commit-and-review.md` | When writing short commit messages or compact code review comments |

## Bundled Scripts

| Script | Purpose | Usage |
|---|---|---|
| `scripts/token_report.js` | Scan common agent memory/rules files and estimate their token weight | `node skills/token-saver/scripts/token_report.js --root . --json` |
| `scripts/scaffold_compact_memory.js` | Generate a compact memory/rules file scaffold for a specific agent | `node skills/token-saver/scripts/scaffold_compact_memory.js --agent codex --root . --project "My Project"` |

## Constraints

**MUST DO**
- Keep technical facts exact while removing filler, pleasantries, hedging, and repeated restatements.
- Prefer short conclusions followed by compact evidence bullets when the topic is non-trivial.
- Preserve code blocks, commands, paths, URLs, identifiers, equations, and configuration keys unchanged unless the user asked to rewrite them.
- Keep memory files focused on durable defaults, constraints, workflow rules, and references the agent really needs every session.
- For review comments, make each finding standalone and actionable.

**MUST NOT DO**
- Do not drop safety warnings, migration notes, or blockers just to save tokens.
- Do not rewrite code syntax, shell commands, or config snippets into ambiguous shorthand.
- Do not make answers cryptic or theatrical; the goal is fewer tokens, not a gimmick.
- Do not keep long narrative background sections in memory files when bullets or tables say the same thing.
- Do not compress ephemeral task details into persistent memory files.

## Output Template

Use the smallest format that still fits the task:

### Compact technical answer

```text
Verdict / main answer.

- Key fact 1.
- Key fact 2.
- Next step.
```

### Compact commit

```text
type(scope): short reason-focused subject
```

### Compact review

```text
L42 bug: user may be null. Add guard before access.
```

### Compact memory file

```markdown
# <Project> Memory

## Mission
- Durable project objective.

## Defaults
- Concise answer style.
- Exact code and commands.

## Constraints
- High-signal rules only.

## Workflow
- Read context.
- Act.
- Validate.
```

## References

- [caveman README](https://github.com/JuliusBrussee/caveman/blob/main/README.md)
- [caveman command: caveman.toml](https://raw.githubusercontent.com/JuliusBrussee/caveman/main/commands/caveman.toml)
- [caveman command: caveman-commit.toml](https://raw.githubusercontent.com/JuliusBrussee/caveman/main/commands/caveman-commit.toml)
- [caveman command: caveman-review.toml](https://raw.githubusercontent.com/JuliusBrussee/caveman/main/commands/caveman-review.toml)
- [caveman-compress README](https://github.com/JuliusBrussee/caveman/blob/main/caveman-compress/README.md)
