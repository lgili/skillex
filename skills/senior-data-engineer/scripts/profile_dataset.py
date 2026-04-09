#!/usr/bin/env python3
"""Profile a CSV, JSON-lines, or Parquet dataset for data engineering readiness.

Outputs per-column: inferred type, null rate, unique count, sample values,
and min/max/mean for numeric columns.

Usage:
    python profile_dataset.py data/orders.csv
    python profile_dataset.py data/events.csv --sample 10000 --json
    python profile_dataset.py data/table.csv --null-threshold 0.05
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class ColumnProfile:
    name: str
    inferred_type: str        # numeric | text | boolean | empty
    total_rows: int
    non_null_count: int
    null_count: int
    null_rate: float
    unique_count: int
    cardinality_hint: str     # identifier | low | medium | high
    min_value: str
    max_value: str
    mean_value: str           # numeric only, else ""
    top_values: list[str]
    flag: str                 # "" | WARN | CRITICAL


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Profile a CSV/JSON-lines dataset for data engineering.")
    parser.add_argument("file", help="Path to the CSV or JSON-lines file.")
    parser.add_argument("--sample", type=int, default=0, help="Sample first N rows (0 = all rows).")
    parser.add_argument("--null-threshold", type=float, default=0.10, help="Null rate above this triggers WARN (default: 0.10).")
    parser.add_argument("--null-critical", type=float, default=0.50, help="Null rate above this triggers CRITICAL (default: 0.50).")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    return parser.parse_args()


def _try_float(v: str) -> float | None:
    try:
        return float(v.replace(",", "").replace("$", "").strip())
    except (ValueError, AttributeError):
        return None


def _infer_type(values: list[str]) -> str:
    """Infer the dominant type from a sample of non-null string values."""
    if not values:
        return "empty"
    numeric = sum(1 for v in values if _try_float(v) is not None)
    if numeric / len(values) > 0.85:
        return "numeric"
    bool_vals = {"true", "false", "yes", "no", "1", "0", "t", "f"}
    if all(v.lower() in bool_vals for v in values):
        return "boolean"
    return "text"


def _cardinality_hint(unique_count: int, total: int) -> str:
    if total == 0:
        return "unknown"
    ratio = unique_count / total
    if ratio > 0.95:
        return "identifier"
    if unique_count <= 10:
        return "low"
    if unique_count <= 100:
        return "medium"
    return "high"


def profile_csv(path: Path, sample: int, null_threshold: float, null_critical: float) -> tuple[list[ColumnProfile], int]:
    with path.open(newline="", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError("No header row found in CSV.")
        fieldnames: list[str] = list(reader.fieldnames)

        # Collect values per column
        col_values: dict[str, list[str]] = {col: [] for col in fieldnames}
        row_count = 0
        for row in reader:
            row_count += 1
            for col in fieldnames:
                col_values[col].append(row.get(col, "") or "")
            if sample and row_count >= sample:
                break

    profiles: list[ColumnProfile] = []
    for col in fieldnames:
        vals = col_values[col]
        total = len(vals)
        non_null = [v for v in vals if v.strip() != ""]
        null_count = total - len(non_null)
        null_rate = null_count / total if total else 0.0
        unique_count = len(set(non_null))
        cardinality = _cardinality_hint(unique_count, len(non_null))
        inferred = _infer_type(non_null[:200])

        min_v = max_v = mean_v = ""
        if inferred == "numeric" and non_null:
            nums = [_try_float(v) for v in non_null if _try_float(v) is not None]
            if nums:
                min_v = str(min(nums))
                max_v = str(max(nums))
                mean_v = f"{sum(nums)/len(nums):.4f}"

        # Top values (for non-numeric or low-cardinality)
        from collections import Counter
        top_values: list[str] = []
        if inferred != "numeric" or cardinality in ("low", "medium"):
            counter = Counter(non_null)
            top_values = [f"{v} ({c})" for v, c in counter.most_common(5)]

        if null_rate >= null_critical:
            flag = "CRITICAL"
        elif null_rate >= null_threshold:
            flag = "WARN"
        else:
            flag = ""

        profiles.append(ColumnProfile(
            name=col,
            inferred_type=inferred,
            total_rows=total,
            non_null_count=len(non_null),
            null_count=null_count,
            null_rate=round(null_rate, 4),
            unique_count=unique_count,
            cardinality_hint=cardinality,
            min_value=min_v,
            max_value=max_v,
            mean_value=mean_v,
            top_values=top_values,
            flag=flag,
        ))
    return profiles, row_count


def main() -> None:
    args = parse_args()
    path = Path(args.file)
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        raise SystemExit(1)

    suffix = path.suffix.lower()
    if suffix not in (".csv", ".tsv", ".txt"):
        print(f"Only CSV files are supported in the no-dependency version. Got: {suffix}", file=sys.stderr)
        print("For Parquet support, install pyarrow and use pandas: pd.read_parquet(path)", file=sys.stderr)
        raise SystemExit(1)

    profiles, row_count = profile_csv(path, args.sample, args.null_threshold, args.null_critical)

    if args.json:
        out = {
            "file": str(path),
            "total_rows": row_count,
            "total_columns": len(profiles),
            "columns": [asdict(p) for p in profiles],
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return

    print(f"Dataset: {path.name}  |  Rows: {row_count}  |  Columns: {len(profiles)}")
    print("=" * 80)
    warn_cols = [p for p in profiles if p.flag]
    if warn_cols:
        print(f"\n⚠  Quality issues found in: {', '.join(p.name for p in warn_cols)}\n")

    for p in profiles:
        flag_str = f"[{p.flag}] " if p.flag else ""
        print(f"\n{flag_str}{p.name}  ({p.inferred_type})")
        print(f"  Rows: {p.total_rows}  |  Nulls: {p.null_count} ({p.null_rate*100:.1f}%)"
              f"  |  Unique: {p.unique_count} ({p.cardinality_hint})")
        if p.inferred_type == "numeric":
            print(f"  Range: [{p.min_value}, {p.max_value}]  |  Mean: {p.mean_value}")
        if p.top_values:
            print(f"  Top values: {' | '.join(p.top_values[:3])}")


if __name__ == "__main__":
    main()
