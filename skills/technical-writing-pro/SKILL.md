---
name: technical-writing-pro
description: Technical and scientific writing for engineering reports, design notes, validation documents, failure analyses, and research-style summaries. Use when the user wants concise English writing, direct technical-scientific structure, fewer long paragraphs, and stronger explanation through equations, tables, figures, graphs, and annotated visuals. Trigger for asks like "technical writing", "write this report better", "make this more scientific", "rewrite in English", "less verbose", "direct report", "engineering report", "validation report", "design note", "failure analysis", or Portuguese asks like "escrita tecnica", "relatorio tecnico", "mais direto", "em ingles", "cientifico", "sem prolixidade", and "usar tabelas e graficos".
---

# Technical Writing Pro

## Overview

Use this skill to write and rewrite technical reports in English with a compact,
scientific, evidence-first style.

Default stance:

- Write in clear technical English.
- Prefer short sections, short paragraphs, and direct claims.
- Replace weak narrative with equations, tables, figures, charts, and annotated visuals whenever they explain faster.
- Make every section answer a decision, question, or technical claim.
- Treat reader attention as scarce; remove filler aggressively.

## Core Workflow

1. Identify the document purpose before drafting.
   - What decision should the report support?
   - Who is the reader: engineer, reviewer, manager, customer, auditor?
   - What document shape fits best: design note, test report, validation report, failure analysis, or research-style summary?

2. Plan the non-text explanation first.
   - List candidate figures, charts, tables, and equations before writing dense prose.
   - Use tables for comparisons, requirements, parameters, and results.
   - Use figures for architecture, setup, flow, and visual evidence.
   - Use charts for trends, distributions, transients, and performance curves.
   - Use equations only when they compress reasoning or make assumptions explicit.

3. Build a strict technical structure.
   - Start with objective, scope, assumptions, and key result.
   - Keep one technical point per subsection.
   - Make evidence visible near the claim it supports.
   - End with conclusion, risks, and next actions instead of generic wrap-up text.

4. Draft in concise scientific English.
   - Prefer concrete nouns, measurable statements, and unambiguous verbs.
   - Keep sentences short when possible.
   - Define notation, variables, and units once, then reuse them consistently.
   - Use bullet lists only when they improve scan speed.

5. Compress and sharpen.
   - Remove repetition, throat-clearing, and obvious statements.
   - Merge or delete paragraphs that do not add evidence or interpretation.
   - Turn descriptive prose into a table, equation, or figure caption when that is faster to read.

6. Final technical pass.
   - Check that every figure, table, and equation is referenced and explained.
   - Check that claims are supported by data, logic, or cited assumptions.
   - Check that the result sounds written by an engineer, not by marketing.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| Document shapes and section order | `references/report-structure.md` | Choosing the right structure for design, test, validation, failure, or research-style reports |
| Concise technical English | `references/style-and-language.md` | Rewriting verbose text into direct scientific prose |
| Figures, tables, charts, and captions | `references/visual-explanation-patterns.md` | Deciding how to replace prose with visuals or tabular evidence |
| Equations, symbols, and units | `references/equations-and-notation.md` | Writing equations clearly and defining notation consistently |
| Review and tightening pass | `references/review-checklist.md` | Final editing, compression, and quality control |

## Bundled Scripts

- `scripts/scaffold_report_outline.py`
  - Generates a concise report outline in Markdown with placeholders for objective, assumptions, figures, tables, charts, equations, results, risks, and next actions.
  - Use when starting a new technical report and you want the structure to encourage evidence-first writing instead of long prose.

## Constraints

### MUST DO

- Write in English unless the user explicitly asks for another language.
- Prefer equations, tables, figures, and charts when they explain more efficiently than prose.
- Keep conclusions explicit, measurable, and technically defensible.
- Define variables, acronyms, assumptions, and units clearly.
- Organize the report around decisions, evidence, and interpretation.
- State what is known, what is assumed, and what is still pending.

### MUST NOT DO

- Do not produce long generic introductions that add no technical value.
- Do not bury the main result deep in the document.
- Do not use vague adjectives like "good", "bad", "better", or "robust" without context or evidence.
- Do not add equations as decoration when a table or sentence would be clearer.
- Do not leave visuals unexplained or disconnected from the narrative.
- Do not write in a promotional or overly literary tone.

## Output Template

For non-trivial writing tasks, provide:

1. Document purpose and chosen structure.
2. Proposed or inserted figures, tables, charts, and equations.
3. Rewritten technical content in concise English.
4. Remaining gaps, assumptions, or recommended additions.

## Primary References

- [Google Technical Writing](https://developers.google.com/tech-writing)
- [NIST Editorial Style Manual](https://www.nist.gov/publications/nist-editorial-style-manual)
- [The Elements of Style](https://www.bartleby.com/141/)
