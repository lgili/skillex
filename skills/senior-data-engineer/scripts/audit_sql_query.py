#!/usr/bin/env python3
"""Static analysis of SQL queries for anti-patterns and optimization hints.

Checks for: SELECT *, Cartesian joins, missing WHERE on large aggregations,
non-sargable predicates, DISTINCT masking join issues, unbounded DELETE/UPDATE,
and other common SQL issues.

Usage:
    python audit_sql_query.py --file queries/transform.sql
    python audit_sql_query.py --query "SELECT * FROM orders WHERE DATE(created_at) = '2024-01-01'"
    python audit_sql_query.py --file queries/mart.sql --dialect bigquery --json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class Finding:
    severity: str    # CRITICAL | WARN | INFO
    rule: str
    message: str
    line: int
    snippet: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit SQL queries for anti-patterns and optimization hints.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", help="Path to a .sql file.")
    group.add_argument("--query", help="SQL string to audit inline.")
    parser.add_argument(
        "--dialect",
        choices=["generic", "bigquery", "snowflake", "postgres", "redshift"],
        default="generic",
        help="SQL dialect for dialect-specific hints (default: generic).",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    return parser.parse_args()


def _load_sql(args: argparse.Namespace) -> str:
    if args.file:
        p = Path(args.file)
        if not p.exists():
            print(f"File not found: {p}", file=sys.stderr)
            raise SystemExit(1)
        return p.read_text(encoding="utf-8")
    return args.query


def _split_statements(sql: str) -> list[str]:
    """Split SQL into individual statements on semicolons (not inside strings)."""
    stmts = re.split(r";(?=(?:[^'\"]*['\"][^'\"]*['\"])*[^'\"]*$)", sql.strip())
    return [s.strip() for s in stmts if s.strip()]


def _line_number(sql: str, match_start: int) -> int:
    return sql[:match_start].count("\n") + 1


def _snippet(sql: str, match_start: int, context: int = 60) -> str:
    end = min(match_start + context, len(sql))
    return sql[match_start:end].replace("\n", " ").strip()


def audit(sql: str, dialect: str) -> list[Finding]:
    findings: list[Finding] = []
    sql_upper = sql.upper()

    def add(severity: str, rule: str, message: str, pos: int = 0) -> None:
        findings.append(Finding(
            severity=severity,
            rule=rule,
            message=message,
            line=_line_number(sql, pos),
            snippet=_snippet(sql, pos),
        ))

    # ── CRITICAL ──────────────────────────────────────────────────────────────

    # SELECT *
    for m in re.finditer(r"\bSELECT\s+\*", sql, re.IGNORECASE):
        add("CRITICAL", "select-star",
            "SELECT * enumerates all columns including future-added ones. "
            "Enumerate columns explicitly in production SQL.",
            m.start())

    # Cartesian join (FROM a, b without explicit JOIN)
    # Detect commas in FROM clause that aren't in subqueries
    for m in re.finditer(r"\bFROM\b\s+\w+\s*,\s*\w+", sql, re.IGNORECASE):
        add("CRITICAL", "cartesian-join",
            "Comma-separated tables in FROM clause creates a Cartesian join. "
            "Use explicit JOIN ... ON syntax.",
            m.start())

    # DELETE or UPDATE without WHERE
    for m in re.finditer(r"\b(DELETE|UPDATE)\b", sql, re.IGNORECASE):
        stmt_tail = sql[m.start():m.start() + 300]
        if not re.search(r"\bWHERE\b", stmt_tail, re.IGNORECASE):
            add("CRITICAL", "unbounded-mutation",
                f"{m.group().upper()} statement has no WHERE clause — this will affect ALL rows.",
                m.start())

    # ── WARN ──────────────────────────────────────────────────────────────────

    # Non-sargable: function on filter columns
    non_sargable_patterns = [
        (r"\bWHERE\b.*\bDATE\s*\(", "WARN", "DATE() wrapping on a filter column prevents partition/index use. "
         "Use range filter: col >= 'date' AND col < 'date+1'."),
        (r"\bWHERE\b.*\bYEAR\s*\(", "WARN", "YEAR() wrapping prevents partition pruning. Use date range filter."),
        (r"\bWHERE\b.*\bLOWER\s*\(", "WARN", "LOWER() on filter column may prevent index use in some databases. "
         "Consider storing lowercased value or using case-insensitive collation."),
        (r"\bWHERE\b.*\bUPPER\s*\(", "WARN", "UPPER() on filter column may prevent index use."),
        (r"\bWHERE\b.*\bCAST\s*\(", "WARN", "CAST() on a filter column may prevent partition/index use. "
         "Store or compare values in the native column type."),
    ]
    for pattern, severity, message in non_sargable_patterns:
        for m in re.finditer(pattern, sql, re.IGNORECASE):
            add(severity, "non-sargable", message, m.start())

    # DISTINCT masking a join fanout
    for m in re.finditer(r"\bSELECT\s+DISTINCT\b", sql, re.IGNORECASE):
        # Check if there is a JOIN nearby
        context_window = sql[max(0, m.start()-10):m.start() + 400]
        if re.search(r"\bJOIN\b", context_window, re.IGNORECASE):
            add("WARN", "distinct-join-fanout",
                "DISTINCT after JOIN may be masking a join fanout (unintended row multiplication). "
                "Verify the join cardinality and add deduplication at the source instead.",
                m.start())

    # NOT IN with subquery (NULL-unsafe)
    for m in re.finditer(r"\bNOT\s+IN\s*\(", sql, re.IGNORECASE):
        context_window = sql[m.start():m.start() + 200]
        if re.search(r"\bSELECT\b", context_window, re.IGNORECASE):
            add("WARN", "not-in-null-unsafe",
                "NOT IN (subquery) returns no rows if the subquery contains any NULL. "
                "Use NOT EXISTS or a LEFT ANTI JOIN instead.",
                m.start())

    # LIMIT without ORDER BY
    for m in re.finditer(r"\bLIMIT\b\s+\d+", sql, re.IGNORECASE):
        stmt_context = sql[max(0, m.start()-500):m.start()]
        if not re.search(r"\bORDER\s+BY\b", stmt_context, re.IGNORECASE):
            add("WARN", "limit-without-order",
                "LIMIT without ORDER BY returns a non-deterministic subset. "
                "Add ORDER BY to get reproducible results.",
                m.start())

    # HAVING on non-aggregated column
    for m in re.finditer(r"\bHAVING\b", sql, re.IGNORECASE):
        having_clause = sql[m.start():m.start() + 200]
        if not re.search(r"\b(COUNT|SUM|AVG|MIN|MAX|APPROX_COUNT_DISTINCT)\s*\(", having_clause, re.IGNORECASE):
            add("WARN", "having-no-aggregate",
                "HAVING clause with no aggregate function — use WHERE instead. "
                "HAVING filters after aggregation; WHERE filters before (much more efficient).",
                m.start())

    # ── INFO ──────────────────────────────────────────────────────────────────

    # Platform-specific hints
    if dialect in ("bigquery", "snowflake") and re.search(r"\bCOUNT\s*\(\s*DISTINCT", sql, re.IGNORECASE):
        for m in re.finditer(r"\bCOUNT\s*\(\s*DISTINCT", sql, re.IGNORECASE):
            add("INFO", "approx-count-distinct",
                f"On {dialect}, consider APPROX_COUNT_DISTINCT() for large tables — "
                f"much faster with ~2% error (acceptable for most analytics).",
                m.start())

    if not re.search(r"\bWHERE\b", sql_upper) and re.search(r"\bFROM\b", sql_upper):
        add("INFO", "no-where-clause",
            "Query has no WHERE clause — ensure this is intentional and not scanning the full table.",
            0)

    # Subquery in SELECT (correlated subquery)
    for m in re.finditer(r"\bSELECT\b.*\(\s*SELECT\b", sql, re.IGNORECASE | re.DOTALL):
        add("INFO", "correlated-subquery",
            "Scalar subquery in SELECT list may execute once per row (O(n) cost). "
            "Consider rewriting as a window function or a JOIN.",
            m.start())

    return findings


def main() -> None:
    args = parse_args()
    sql = _load_sql(args)
    findings = audit(sql, args.dialect)

    if args.json:
        print(json.dumps({
            "dialect": args.dialect,
            "total_findings": len(findings),
            "critical": sum(1 for f in findings if f.severity == "CRITICAL"),
            "warn": sum(1 for f in findings if f.severity == "WARN"),
            "info": sum(1 for f in findings if f.severity == "INFO"),
            "findings": [asdict(f) for f in findings],
        }, ensure_ascii=False, indent=2))
        return

    label = args.file or "(inline query)"
    criticals = [f for f in findings if f.severity == "CRITICAL"]
    warns = [f for f in findings if f.severity == "WARN"]
    infos = [f for f in findings if f.severity == "INFO"]

    print(f"SQL Audit: {label}  (dialect: {args.dialect})")
    print(f"Results: {len(criticals)} critical  |  {len(warns)} warn  |  {len(infos)} info")
    print("=" * 70)

    for f in findings:
        icons = {"CRITICAL": "✗", "WARN": "⚠", "INFO": "ℹ"}
        print(f"\n{icons.get(f.severity, '?')} [{f.severity}] {f.rule}  (line {f.line})")
        print(f"  {f.message}")
        if f.snippet:
            print(f"  → {f.snippet[:100]}")

    if not findings:
        print("\nNo issues found.")

    raise SystemExit(1 if criticals else 0)


if __name__ == "__main__":
    main()
