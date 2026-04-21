---
name: token-saver
description: Save output and always-on context tokens without losing technical accuracy. Use when asked to be terse, less verbose, shorter, token-efficient, to compress AGENTS.md or CLAUDE.md style files, to write short commits, or to give one-line review comments. Trigger for asks like "save tokens", "be terse", "less verbose", "compress this memory file", "rewrite AGENTS.md shorter", "short commit message", or "one-line review".
---

# Token Saver

## Overview

Use this skill to cut token use in four places:

- normal replies
- always-on memory/rules files
- commit messages
- code review comments

Model should talk smaller, not think smaller. Keep technical substance exact.

## Compression Levels

| Level | Use when | Behavior |
|---|---|---|
| `lite` | User wants concise but still polished output | Keep grammar. Remove filler and throat-clearing. |
| `full` | Default | Short clauses, fragments OK, answer first, no fluff. |
| `ultra` | User wants maximum compression | Telegraphic. Keep only technical nouns, action, reason, next step. |

## Core Workflow

1. **Pick target** — reply, memory file, commit, or review.
2. **Preserve exact anchors** — code, commands, paths, URLs, API names, equations, versions, config keys.
3. **Compress structure first** — answer first, bullets over prose, no repeated caveats, no pleasantries.
4. **Use micro-format** — terse answer, terse commit, one-line review, or compact memory file.
5. **Audit or scaffold when useful** — use the scripts below instead of rewriting boilerplate manually.

## Always-On Snippet

Use this when the user wants the style active every session. Generate a ready-to-paste variant with `scripts/emit_activation_snippet.js`.

```text
Terse by default. Technical substance exact.
Drop filler, pleasantries, hedging, and repeated restatements.
Lead with answer. Short clauses or fragments OK.
Keep code, commands, paths, URLs, and identifiers exact.
Format: [thing] [action] [reason]. [next step].
```

## Reference Guide

| Topic | Reference | When to load |
|---|---|---|
| Response compression | `references/response-compression.md` | Shortening answers without losing meaning |
| Memory and rules files | `references/memory-file-strategy.md` | Rewriting `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or agent rules |
| Terse commits and reviews | `references/terse-commit-and-review.md` | Writing short commits or one-line review comments |

## Bundled Scripts

| Script | Purpose | Usage |
|---|---|---|
| `scripts/token_report.js` | Rank expensive memory and rules files by estimated token cost | `node skills/token-saver/scripts/token_report.js --root . --json` |
| `scripts/scaffold_compact_memory.js` | Generate a compact memory/rules scaffold | `node skills/token-saver/scripts/scaffold_compact_memory.js --agent codex --root . --project "My Project"` |
| `scripts/emit_activation_snippet.js` | Emit ready-to-paste always-on snippets by agent and compression level | `node skills/token-saver/scripts/emit_activation_snippet.js --agent codex --level full` |

## Constraints

**MUST DO**
- Keep technical facts exact.
- Prefer short conclusions plus compact bullets.
- Keep memory files limited to durable defaults and hard rules.
- For reviews, one finding per line.
- For commits, prefer why over what.

**MUST NOT DO**
- Do not drop blockers, migration notes, or safety warnings.
- Do not rewrite code or commands into ambiguous shorthand.
- Do not store ephemeral notes or secrets in always-on memory files.
- Do not waste tokens on praise, setup, or obvious narration when not needed.

## Output Micro-Formats

### Terse answer

```text
Verdict.

- Fact.
- Fact.
- Next step.
```

### Terse commit

```text
type(scope): short why-focused subject
```

Target:
- Conventional Commits
- subject `<= 50` chars when possible
- no body unless why is not obvious

### Terse review

```text
L42 bug: user may be null. Guard.
```

Rules:
- one line per finding
- severity: `bug`, `risk`, `nit`, `q`
- if code good: `LGTM`

### Compact memory file

```markdown
# <Project> Memory

## Mission
- Durable goal.

## Defaults
- Terse by default.
- Exact code and commands.

## Constraints
- Hard rules only.

## Workflow
- Read.
- Act.
- Validate.
```

## References

- [caveman README](https://github.com/JuliusBrussee/caveman)
- [caveman command prompt](https://raw.githubusercontent.com/JuliusBrussee/caveman/main/commands/caveman.toml)
- [caveman commit prompt](https://raw.githubusercontent.com/JuliusBrussee/caveman/main/commands/caveman-commit.toml)
- [caveman review prompt](https://raw.githubusercontent.com/JuliusBrussee/caveman/main/commands/caveman-review.toml)
- [caveman-compress README](https://github.com/JuliusBrussee/caveman/blob/main/caveman-compress/README.md)
