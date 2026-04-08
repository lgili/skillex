#!/usr/bin/env python3
"""Generate a concise technical-report outline with visual placeholders."""

from __future__ import annotations

import argparse
from pathlib import Path


OUTLINES: dict[str, list[str]] = {
    "technical-report": [
        "## 1. Objective",
        "- What problem does this report address?",
        "- What is the key result or decision?",
        "",
        "## 2. Scope and Assumptions",
        "- Scope boundaries",
        "- Main assumptions",
        "- Known exclusions",
        "",
        "## 3. Key Technical Background",
        "- Only the minimum context required to read the results",
        "",
        "## 4. Figures, Tables, Charts, and Equations Plan",
        "- Figure 1: [architecture / setup / annotated photo]",
        "- Table 1: [requirements / parameters / comparison]",
        "- Chart 1: [trend / waveform / performance curve]",
        "- Equation 1: [core relation or budget]",
        "",
        "## 5. Analysis or Results",
        "- Main measured or derived result",
        "- Supporting evidence",
        "- Interpretation",
        "",
        "## 6. Risks, Limits, and Open Points",
        "- What is still uncertain?",
        "- What evidence is missing?",
        "",
        "## 7. Conclusion and Next Actions",
        "- Direct technical conclusion",
        "- Immediate next steps",
    ],
    "design-note": [
        "## 1. Objective",
        "- Design goal",
        "- Decision to support",
        "",
        "## 2. Constraints and Assumptions",
        "- Functional constraints",
        "- Physical constraints",
        "- Cost / schedule constraints",
        "",
        "## 3. Proposed Architecture",
        "- Figure 1: block diagram",
        "- Main interfaces",
        "",
        "## 4. Core Equations or Budgets",
        "- Equation 1: key sizing relation",
        "- Table 1: parameter budget",
        "",
        "## 5. Tradeoffs",
        "- Option comparison",
        "- Table 2: tradeoff matrix",
        "",
        "## 6. Risks and Next Actions",
        "- Main design risks",
        "- Follow-up work",
    ],
    "test-report": [
        "## 1. Objective and Scope",
        "- What was tested?",
        "- Pass/fail target",
        "",
        "## 2. Setup and Instrumentation",
        "- Figure 1: setup image or diagram",
        "- Table 1: instrument list",
        "",
        "## 3. Procedure Summary",
        "- Short execution sequence",
        "",
        "## 4. Results",
        "- Table 2: results matrix",
        "- Chart 1: key waveform or trend",
        "",
        "## 5. Deviations and Open Points",
        "- Failed or deferred checks",
        "",
        "## 6. Conclusion",
        "- Direct technical outcome",
    ],
    "validation-report": [
        "## 1. Validation Scope",
        "- Requirements in scope",
        "- Exclusions",
        "",
        "## 2. Requirement Traceability",
        "- Table 1: requirement matrix",
        "",
        "## 3. Evidence",
        "- Figure 1: primary evidence",
        "- Table 2: evidence inventory",
        "- Equation 1: if model-based argument is needed",
        "",
        "## 4. Exceptions and Open Issues",
        "- Remaining gaps",
        "",
        "## 5. Compliance Statement",
        "- Direct validation outcome",
    ],
    "failure-analysis": [
        "## 1. Symptom and Impact",
        "- What failed?",
        "- Operational impact",
        "",
        "## 2. Timeline",
        "- Table 1: timeline of events",
        "",
        "## 3. Evidence",
        "- Figure 1: failure evidence or annotated image",
        "- Table 2: evidence log",
        "",
        "## 4. Root-Cause Reasoning",
        "- Hypotheses",
        "- Table 3: hypothesis matrix",
        "",
        "## 5. Corrective Actions",
        "- Immediate containment",
        "- Verification plan",
    ],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a technical report outline in Markdown.")
    parser.add_argument("--title", default="Untitled Report", help="Report title.")
    parser.add_argument(
        "--report-type",
        choices=sorted(OUTLINES),
        default="technical-report",
        help="Outline family.",
    )
    parser.add_argument("--output", default="report-outline.md", help="Output Markdown path.")
    parser.add_argument("--author", default="Your Name", help="Author name.")
    parser.add_argument("--project", default="Project Name", help="Project or product name.")
    parser.add_argument("--force", action="store_true", help="Overwrite the output if it already exists.")
    return parser.parse_args()


def build_outline(title: str, report_type: str, author: str, project: str) -> str:
    body = "\n".join(OUTLINES[report_type])
    return (
        f"# {title}\n\n"
        f"- Report type: {report_type}\n"
        f"- Project: {project}\n"
        f"- Author: {author}\n"
        f"- Language: English\n"
        f"- Writing target: concise technical-scientific style\n\n"
        "## Writing Rules\n"
        "- Keep paragraphs short.\n"
        "- Prefer tables, figures, charts, and equations over long narrative when they explain faster.\n"
        "- State claims directly and support them with evidence.\n"
        "- End with conclusion, risks, and next actions.\n\n"
        f"{body}\n"
    )


def main() -> int:
    args = parse_args()
    output_path = Path(args.output).resolve()
    if output_path.exists() and not args.force:
        raise SystemExit(f"Output already exists: {output_path}. Use --force to overwrite.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        build_outline(args.title, args.report_type, args.author, args.project),
        encoding="utf-8",
    )
    print(f"Wrote outline: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
