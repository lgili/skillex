#!/usr/bin/env python3
"""Profile dataset columns for machine learning readiness.

Analyzes each column for: inferred type, null rate, cardinality,
suggested ML treatment (feature/target/drop/id), encoding recommendation,
and data quality flags.

Usage:
    python profile_features.py data/dataset.csv
    python profile_features.py data/dataset.csv --target churn --sample 5000
    python profile_features.py data/features.csv --json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class FeatureProfile:
    name: str
    inferred_type: str         # numeric | categorical | binary | datetime | text | id | constant | empty
    total_rows: int
    null_count: int
    null_rate: float
    unique_count: int
    cardinality: str           # constant | binary | low | medium | high | identifier
    # Numeric stats
    min_val: float | None
    max_val: float | None
    mean_val: float | None
    std_val: float | None
    skewness_hint: str         # "" | "right-skewed" | "left-skewed" | "near-normal"
    # Categorical
    top_values: list[str]
    # ML suggestions
    suggested_role: str        # feature | target | id | drop
    encoding_recommendation: str
    flags: list[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Profile dataset features for machine learning readiness.")
    parser.add_argument("file", help="Path to a CSV file.")
    parser.add_argument("--target", default="", help="Name of the target column (label it explicitly).")
    parser.add_argument("--sample", type=int, default=0, help="Sample first N rows (0 = all).")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    return parser.parse_args()


def _try_float(v: str) -> float | None:
    try:
        return float(v.replace(",", "").replace("$", "").replace("%", "").strip())
    except (ValueError, AttributeError):
        return None


def _is_datetime_like(values: list[str]) -> bool:
    import re
    dt_pattern = re.compile(
        r"^\d{4}[-/]\d{2}[-/]\d{2}"  # YYYY-MM-DD or YYYY/MM/DD
        r"|^\d{2}[-/]\d{2}[-/]\d{4}"  # DD/MM/YYYY
        r"|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}"  # ISO 8601
    )
    hits = sum(1 for v in values[:50] if v and dt_pattern.match(v.strip()))
    return hits / max(len(values[:50]), 1) > 0.8


def _std(nums: list[float]) -> float:
    if len(nums) < 2:
        return 0.0
    mean = sum(nums) / len(nums)
    variance = sum((x - mean) ** 2 for x in nums) / (len(nums) - 1)
    return math.sqrt(variance)


def _skewness(nums: list[float]) -> str:
    if len(nums) < 10:
        return ""
    mean = sum(nums) / len(nums)
    median = sorted(nums)[len(nums) // 2]
    std = _std(nums)
    if std == 0:
        return ""
    # Pearson's second skewness coefficient
    sk = 3 * (mean - median) / std
    if sk > 1.0:
        return "right-skewed"
    if sk < -1.0:
        return "left-skewed"
    return "near-normal"


def _infer_type(non_null: list[str]) -> str:
    if not non_null:
        return "empty"
    unique_lower = {v.lower().strip() for v in non_null[:200]}
    bool_vals = {"true", "false", "yes", "no", "1", "0", "t", "f", "y", "n"}
    if unique_lower <= bool_vals:
        return "binary"
    nums = [_try_float(v) for v in non_null[:200]]
    if sum(1 for n in nums if n is not None) / len(nums) > 0.85:
        return "numeric"
    if _is_datetime_like(non_null):
        return "datetime"
    # Text vs categorical
    avg_len = sum(len(v) for v in non_null[:100]) / len(non_null[:100])
    if avg_len > 40:
        return "text"
    return "categorical"


def _cardinality(unique_count: int, total: int, inferred_type: str) -> str:
    if unique_count <= 1:
        return "constant"
    if unique_count == 2:
        return "binary"
    if total > 0 and unique_count / total > 0.90 and inferred_type not in ("numeric",):
        return "identifier"
    if unique_count <= 10:
        return "low"
    if unique_count <= 50:
        return "medium"
    return "high"


def _suggest_role(name: str, inferred_type: str, cardinality: str, target: str) -> str:
    if name == target:
        return "target"
    if cardinality == "constant":
        return "drop"
    if cardinality == "identifier":
        return "id"
    if inferred_type == "text":
        return "drop"
    return "feature"


def _encoding_recommendation(inferred_type: str, cardinality: str, suggested_role: str) -> str:
    if suggested_role in ("target", "id", "drop"):
        return "N/A"
    if inferred_type == "numeric":
        return "StandardScaler (or log-transform if right-skewed)"
    if inferred_type == "binary":
        return "LabelEncoder (0/1)"
    if inferred_type == "datetime":
        return "Extract: year, month, day_of_week, is_weekend (then StandardScaler)"
    if inferred_type == "categorical":
        if cardinality == "low":
            return "OneHotEncoder (drop='first')"
        if cardinality == "medium":
            return "OneHotEncoder or TargetEncoder (inside CV fold)"
        return "TargetEncoder or HashingEncoder (high cardinality)"
    if inferred_type == "text":
        return "TF-IDF or sentence embedding"
    return "review manually"


def profile_file(path: Path, target: str, sample: int) -> tuple[list[FeatureProfile], int]:
    with path.open(newline="", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError("No header row found.")
        fieldnames = list(reader.fieldnames)
        col_values: dict[str, list[str]] = {col: [] for col in fieldnames}
        row_count = 0
        for row in reader:
            row_count += 1
            for col in fieldnames:
                col_values[col].append(row.get(col, "") or "")
            if sample and row_count >= sample:
                break

    profiles: list[FeatureProfile] = []
    for col in fieldnames:
        vals = col_values[col]
        total = len(vals)
        non_null = [v for v in vals if v.strip() != ""]
        null_count = total - len(non_null)
        null_rate = null_count / total if total else 0.0
        unique_count = len(set(non_null))

        inferred = _infer_type(non_null)
        card = _cardinality(unique_count, len(non_null), inferred)
        role = _suggest_role(col, inferred, card, target)
        encoding = _encoding_recommendation(inferred, card, role)

        # Numeric stats
        min_v = max_v = mean_v = std_v = None
        skew_hint = ""
        nums: list[float] = []
        if inferred == "numeric" and non_null:
            nums = [_try_float(v) for v in non_null if _try_float(v) is not None]  # type: ignore[misc]
            if nums:
                min_v = min(nums)
                max_v = max(nums)
                mean_v = round(sum(nums) / len(nums), 4)
                std_v = round(_std(nums), 4)
                skew_hint = _skewness(nums)

        # Top values for categoricals
        counter = Counter(non_null)
        top_values = [f"{v} ({c})" for v, c in counter.most_common(5)] if inferred in ("categorical", "binary") else []

        # Flags
        flags: list[str] = []
        if null_rate >= 0.50:
            flags.append("HIGH_NULL_RATE")
        elif null_rate >= 0.10:
            flags.append("ELEVATED_NULL_RATE")
        if card == "constant":
            flags.append("CONSTANT_COLUMN")
        if card == "identifier" and role == "feature":
            flags.append("POSSIBLE_ID_LEAKAGE")
        if inferred == "numeric" and skew_hint == "right-skewed" and max_v and min_v and max_v > 0 and max_v / max(abs(min_v), 0.001) > 100:
            flags.append("CONSIDER_LOG_TRANSFORM")

        profiles.append(FeatureProfile(
            name=col,
            inferred_type=inferred,
            total_rows=total,
            null_count=null_count,
            null_rate=round(null_rate, 4),
            unique_count=unique_count,
            cardinality=card,
            min_val=min_v,
            max_val=max_v,
            mean_val=mean_v,
            std_val=std_v,
            skewness_hint=skew_hint,
            top_values=top_values,
            suggested_role=role,
            encoding_recommendation=encoding,
            flags=flags,
        ))

    return profiles, row_count


def main() -> None:
    args = parse_args()
    path = Path(args.file)
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        raise SystemExit(1)

    profiles, row_count = profile_file(path, args.target, args.sample)

    if args.json:
        print(json.dumps({
            "file": str(path),
            "total_rows": row_count,
            "total_columns": len(profiles),
            "target": args.target,
            "columns": [asdict(p) for p in profiles],
        }, ensure_ascii=False, indent=2))
        return

    features = [p for p in profiles if p.suggested_role == "feature"]
    ids = [p for p in profiles if p.suggested_role == "id"]
    drops = [p for p in profiles if p.suggested_role == "drop"]
    target_cols = [p for p in profiles if p.suggested_role == "target"]

    print(f"Feature Profile: {path.name}  |  Rows: {row_count}  |  Columns: {len(profiles)}")
    if args.target:
        print(f"Target column: {args.target}")
    print("=" * 80)
    print(f"\nSummary: {len(features)} features  |  {len(target_cols)} target  |  {len(ids)} IDs  |  {len(drops)} to drop")

    flagged = [p for p in profiles if p.flags]
    if flagged:
        print(f"\n⚠  Flagged columns: {', '.join(p.name for p in flagged)}")

    for p in profiles:
        role_icon = {"feature": "✓", "target": "★", "id": "⊘", "drop": "✗"}.get(p.suggested_role, "?")
        print(f"\n{role_icon} {p.name}  [{p.inferred_type}] → {p.suggested_role}")
        print(f"  Nulls: {p.null_count} ({p.null_rate*100:.1f}%)  |  Unique: {p.unique_count} ({p.cardinality})")
        if p.inferred_type == "numeric" and p.mean_val is not None:
            skew = f"  ({p.skewness_hint})" if p.skewness_hint else ""
            print(f"  Range: [{p.min_val:.4g}, {p.max_val:.4g}]  |  Mean: {p.mean_val:.4g}  |  Std: {p.std_val:.4g}{skew}")
        if p.top_values:
            print(f"  Top: {' | '.join(p.top_values[:3])}")
        if p.encoding_recommendation and p.suggested_role == "feature":
            print(f"  Encoding: {p.encoding_recommendation}")
        if p.flags:
            print(f"  🚩 {', '.join(p.flags)}")


if __name__ == "__main__":
    main()
