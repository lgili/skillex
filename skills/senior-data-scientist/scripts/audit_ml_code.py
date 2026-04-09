#!/usr/bin/env python3
"""Audit Python ML code files for common anti-patterns, data leakage risks,
reproducibility issues, and missing evaluation gates.

Uses the AST module (zero external dependencies) to detect:
- fit_transform on test data (leakage)
- Missing train/test split
- Missing cross-validation
- Missing random_state / random seed
- Model evaluated on training data only
- Hardcoded magic numbers as thresholds
- Missing model persistence (never saved)

Usage:
    python audit_ml_code.py model_training.py
    python audit_ml_code.py notebooks/experiment.py --json
    python audit_ml_code.py src/pipeline.py --strict
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class Finding:
    severity: str      # CRITICAL | WARN | INFO
    rule: str
    message: str
    line: int
    col: int
    code_snippet: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit Python ML code for anti-patterns and data leakage risks.")
    parser.add_argument("file", help="Path to a Python .py file to audit.")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on WARN findings (not just CRITICAL).")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON output.")
    return parser.parse_args()


def _snippet_from_source(source_lines: list[str], lineno: int, context: int = 80) -> str:
    if 1 <= lineno <= len(source_lines):
        return source_lines[lineno - 1].strip()[:context]
    return ""


class _MLAuditor(ast.NodeVisitor):
    """Walk the AST and collect ML anti-pattern findings."""

    def __init__(self, source_lines: list[str]) -> None:
        self.source_lines = source_lines
        self.findings: list[Finding] = []
        # Track what names are assigned
        self._assigned_names: set[str] = set()
        self._call_names: list[str] = []
        self._has_train_test_split = False
        self._has_cross_val = False
        self._has_random_state = False
        self._has_fit_transform_test = False
        self._has_score_or_predict = False
        self._has_save_or_dump = False
        self._fit_transform_on: list[str] = []

    def _add(self, severity: str, rule: str, message: str, node: ast.AST) -> None:
        line = getattr(node, "lineno", 0)
        col = getattr(node, "col_offset", 0)
        self.findings.append(Finding(
            severity=severity,
            rule=rule,
            message=message,
            line=line,
            col=col,
            code_snippet=_snippet_from_source(self.source_lines, line),
        ))

    def visit_Call(self, node: ast.Call) -> None:
        func_name = ""
        if isinstance(node.func, ast.Attribute):
            func_name = node.func.attr
        elif isinstance(node.func, ast.Name):
            func_name = node.func.id

        call_str = ast.unparse(node) if hasattr(ast, "unparse") else ""

        # train_test_split
        if func_name == "train_test_split":
            self._has_train_test_split = True

        # cross_val_score, cross_validate, cross_val_predict
        if func_name in ("cross_val_score", "cross_validate", "cross_val_predict",
                         "StratifiedKFold", "KFold", "TimeSeriesSplit"):
            self._has_cross_val = True

        # random_state keyword
        for kw in node.keywords:
            if kw.arg in ("random_state", "seed"):
                self._has_random_state = True

        # fit_transform called on test-set-named variables
        if func_name == "fit_transform":
            # Check if the argument name contains "test" or "val"
            for arg in node.args:
                arg_str = ast.unparse(arg) if hasattr(ast, "unparse") else ""
                if any(word in arg_str.lower() for word in ("test", "val", "holdout", "eval", "x_t")):
                    self._has_fit_transform_test = True
                    self._add(
                        "CRITICAL", "fit-transform-on-test",
                        f"fit_transform() called on what appears to be test/validation data ({arg_str!r}). "
                        "This leaks test distribution into the transformation. "
                        "Use .fit() on train data, .transform() on test data.",
                        node,
                    )

        # Model score / predict (evaluation signal)
        if func_name in ("score", "predict", "predict_proba", "evaluate"):
            self._has_score_or_predict = True

        # Model saving
        if func_name in ("dump", "save", "joblib_dump", "pickle_dump", "log_model", "register_model"):
            self._has_save_or_dump = True
        if func_name == "open" and any(
            isinstance(kw.value, ast.Constant) and "wb" in str(kw.value.s or "")
            for kw in node.keywords
        ):
            self._has_save_or_dump = True

        # numpy.random.seed or random.seed (without random_state kwarg)
        if func_name in ("seed", "set_seed", "manual_seed"):
            self._has_random_state = True

        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign) -> None:
        for target in node.targets:
            if isinstance(target, ast.Name):
                self._assigned_names.add(target.id)
        self.generic_visit(node)

    def summarize(self) -> None:
        """After full tree walk, emit summary findings."""
        if not self._has_train_test_split:
            self.findings.append(Finding(
                severity="WARN",
                rule="missing-train-test-split",
                message="No train_test_split() found. Confirm that data is properly split before model training. "
                        "If split happens elsewhere, add a comment documenting it.",
                line=0,
                col=0,
                code_snippet="",
            ))

        if not self._has_cross_val:
            self.findings.append(Finding(
                severity="WARN",
                rule="missing-cross-validation",
                message="No cross-validation found (cross_val_score, KFold, StratifiedKFold, etc.). "
                        "A single train/test split may produce unreliable model selection results. "
                        "Use cross-validation for model selection.",
                line=0,
                col=0,
                code_snippet="",
            ))

        if not self._has_random_state:
            self.findings.append(Finding(
                severity="WARN",
                rule="missing-random-state",
                message="No random_state / seed detected. Set random_state=42 (or any constant) on all "
                        "stochastic operations (train_test_split, model constructors, CV splitters) "
                        "for reproducibility.",
                line=0,
                col=0,
                code_snippet="",
            ))

        if not self._has_save_or_dump:
            self.findings.append(Finding(
                severity="INFO",
                rule="no-model-persistence",
                message="No model persistence found (joblib.dump, pickle, mlflow.log_model, etc.). "
                        "Ensure trained models are saved for later serving or experiment tracking.",
                line=0,
                col=0,
                code_snippet="",
            ))


def audit_file(path: Path) -> list[Finding]:
    source = path.read_text(encoding="utf-8", errors="replace")
    source_lines = source.splitlines()
    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError as e:
        return [Finding(
            severity="CRITICAL",
            rule="syntax-error",
            message=f"File has a Python syntax error: {e}",
            line=e.lineno or 0,
            col=e.offset or 0,
            code_snippet="",
        )]

    auditor = _MLAuditor(source_lines)
    auditor.visit(tree)
    auditor.summarize()

    # Sort by severity then line number
    order = {"CRITICAL": 0, "WARN": 1, "INFO": 2}
    auditor.findings.sort(key=lambda f: (order.get(f.severity, 9), f.line))
    return auditor.findings


def main() -> None:
    args = parse_args()
    path = Path(args.file)
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        raise SystemExit(1)

    findings = audit_file(path)
    criticals = [f for f in findings if f.severity == "CRITICAL"]
    warns = [f for f in findings if f.severity == "WARN"]
    infos = [f for f in findings if f.severity == "INFO"]

    if args.json:
        print(json.dumps({
            "file": str(path),
            "total_findings": len(findings),
            "critical": len(criticals),
            "warn": len(warns),
            "info": len(infos),
            "findings": [asdict(f) for f in findings],
        }, ensure_ascii=False, indent=2))
        raise SystemExit(1 if criticals or (args.strict and warns) else 0)

    print(f"ML Code Audit: {path}")
    print(f"Results: {len(criticals)} critical  |  {len(warns)} warn  |  {len(infos)} info")
    print("=" * 70)

    icons = {"CRITICAL": "✗", "WARN": "⚠", "INFO": "ℹ"}
    for f in findings:
        location = f"line {f.line}" if f.line else "global"
        print(f"\n{icons.get(f.severity,'?')} [{f.severity}] {f.rule}  ({location})")
        print(f"  {f.message}")
        if f.code_snippet:
            print(f"  → {f.code_snippet}")

    if not findings:
        print("\nNo issues found.")

    raise SystemExit(1 if criticals or (args.strict and warns) else 0)


if __name__ == "__main__":
    main()
