---
name: "C Pro"
description: "Modern C specialist for designing, implementing, reviewing, and modernizing performance-sensitive C across libraries, CLIs, services, and systems code. Use when working with .c, .h, Makefile, CMakeLists.txt, Meson, unit tests, or requests involving memory management, concurrency, performance, or legacy C migration. Trigger for asks like \"c pro\", \"modernizar c\", \"makefile\", \"cmake\", \"meson\", \"performance c\", \"concurrency c\", or \"refatorar c legado\"."
---

# C Pro

Modern C specialist for designing, implementing, reviewing, and modernizing performance-sensitive C across libraries, CLIs, services, and systems code.

## Core Workflow

1. **Understand the request** — Read the task and identify exactly what the user needs.
2. **Gather context** — Load the relevant reference files from the Reference Guide below.
3. **Apply constraints** — Follow the MUST DO / MUST NOT DO rules before generating output.
4. **Produce the output** — Use the Output Template as the structure for your response.
5. **Validate** — Run any bundled scripts that verify correctness before returning.

## Reference Guide

| Topic | Reference | When to load |
|-------|-----------|--------------|
| Architecture And Design | `references/architecture-and-design.md` | When working with architecture and design |
| Build Tooling | `references/build-tooling.md` | When working with build tooling |
| Concurrency | `references/concurrency.md` | When working with concurrency |
| Legacy Modernization | `references/legacy-modernization.md` | When working with legacy modernization |
| Memory Performance | `references/memory-performance.md` | When working with memory performance |
| Modern C | `references/modern-c.md` | When working with modern c |

## Bundled Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/audit_c_project.py` | Audits a C project for compliance with best practices. | `python skills/c-pro/scripts/audit_c_project.py --help` |
| `scripts/bootstrap_c_project.py` | Bootstraps a new C project with a standard structure. | `python skills/c-pro/scripts/bootstrap_c_project.py --help` |
| `scripts/run_c_quality_gates.py` | Runs quality gates (linters, static analysis) on a C project. | `python skills/c-pro/scripts/run_c_quality_gates.py --help` |
| `scripts/scaffold_c_test_template.py` | Scaffolds a new test file for a C project. | `python skills/c-pro/scripts/scaffold_c_test_template.py --help` |

## Constraints

**MUST DO**
- Follow the conventions documented in the reference files.
- Explain your reasoning when a rule conflict arises.
- Produce output that matches the Output Template structure below.

**MUST NOT DO**
- Do not invent conventions not documented in the references.
- Do not skip validation steps when a script is available.
- Do not produce output that contradicts the active constraints.

## Output Template

```
<!-- Describe the expected output structure here. -->
<!-- For example: a commit message, a code diff, a code block with explanation, etc. -->
```

## References

- Add authoritative external links here (specs, RFCs, official documentation).
