#!/usr/bin/env python3
"""Compare simulator CSV output against a reference (golden) dataset and report error metrics.

Computes peak absolute error, RMS error, and steady-state mean absolute error per channel.
Exits non-zero when any channel fails its tolerance.

Usage:
    python verify_simulation.py --sim results/buck.csv --ref golden/buck.csv
    python verify_simulation.py --sim results/buck.csv --ref golden/buck.csv \\
        --tol-peak 0.01 --tol-rms 0.005 --tol-ss 0.002 --steady-state-frac 0.2
    python verify_simulation.py --sim results/buck.csv --ref golden/buck.csv --json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# CSV reading
# ---------------------------------------------------------------------------

def read_csv(path: Path) -> dict[str, list[float]]:
    """Load a CSV file into a dict of column_name -> list[float]."""
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        data: dict[str, list[float]] = {}
        for row in reader:
            for key, val in row.items():
                data.setdefault(key.strip(), []).append(float(val))
    return data


# ---------------------------------------------------------------------------
# Error metrics
# ---------------------------------------------------------------------------

def peak_error(sim: list[float], ref: list[float]) -> float:
    return max(abs(s - r) for s, r in zip(sim, ref))


def rms_error(sim: list[float], ref: list[float]) -> float:
    n = len(sim)
    return math.sqrt(sum((s - r) ** 2 for s, r in zip(sim, ref)) / n)


def steady_state_mean_error(sim: list[float], ref: list[float], frac: float) -> float:
    """Mean absolute error over the last `frac` fraction of the record."""
    start = max(0, int((1.0 - frac) * len(sim)))
    ss_sim = sim[start:]
    ss_ref = ref[start:]
    if not ss_sim:
        return float("inf")
    return sum(abs(s - r) for s, r in zip(ss_sim, ss_ref)) / len(ss_sim)


# ---------------------------------------------------------------------------
# Report dataclasses
# ---------------------------------------------------------------------------

@dataclass
class ChannelResult:
    channel: str
    peak_error: float
    rms_error: float
    steady_state_error: float
    status: str                   # "pass" | "fail"
    fail_reasons: list[str] = field(default_factory=list)


@dataclass
class VerificationReport:
    sim_file: str
    ref_file: str
    tol_peak: float
    tol_rms: float
    tol_ss: float
    steady_state_frac: float
    num_channels: int
    num_samples_compared: int
    results: list[ChannelResult]
    overall: str                  # "pass" | "fail"


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def run_verification(
    sim_path: Path,
    ref_path: Path,
    tol_peak: float,
    tol_rms: float,
    tol_ss: float,
    steady_state_frac: float,
    skip_column: str,
) -> VerificationReport:
    sim_data = read_csv(sim_path)
    ref_data = read_csv(ref_path)

    skip = {skip_column.strip().lower()}
    sim_channels = {k for k in sim_data if k.lower() not in skip}
    ref_channels = {k for k in ref_data if k.lower() not in skip}
    common = sorted(sim_channels & ref_channels)

    if not common:
        raise ValueError(
            "No common signal channels found between sim and ref files. "
            f"Sim channels: {sorted(sim_channels)}  Ref channels: {sorted(ref_channels)}"
        )

    results: list[ChannelResult] = []
    for ch in common:
        s = sim_data[ch]
        r = ref_data[ch]
        n = min(len(s), len(r))
        s, r = s[:n], r[:n]

        pe = peak_error(s, r)
        re = rms_error(s, r)
        se = steady_state_mean_error(s, r, steady_state_frac)

        fail_reasons: list[str] = []
        if pe > tol_peak:
            fail_reasons.append(f"peak_error {pe:.6g} > {tol_peak}")
        if re > tol_rms:
            fail_reasons.append(f"rms_error {re:.6g} > {tol_rms}")
        if se > tol_ss:
            fail_reasons.append(f"steady_state_error {se:.6g} > {tol_ss}")

        results.append(ChannelResult(
            channel=ch,
            peak_error=round(pe, 9),
            rms_error=round(re, 9),
            steady_state_error=round(se, 9),
            status="fail" if fail_reasons else "pass",
            fail_reasons=fail_reasons,
        ))

    overall = "fail" if any(r.status == "fail" for r in results) else "pass"
    anchor_ch = common[0]
    return VerificationReport(
        sim_file=str(sim_path),
        ref_file=str(ref_path),
        tol_peak=tol_peak,
        tol_rms=tol_rms,
        tol_ss=tol_ss,
        steady_state_frac=steady_state_frac,
        num_channels=len(common),
        num_samples_compared=min(len(sim_data[anchor_ch]), len(ref_data[anchor_ch])),
        results=results,
        overall=overall,
    )


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def print_report(report: VerificationReport) -> None:
    print("Simulation Verification Report")
    print(f"  Sim:              {report.sim_file}")
    print(f"  Ref:              {report.ref_file}")
    print(f"  Samples compared: {report.num_samples_compared}")
    print(f"  SS window:        last {report.steady_state_frac * 100:.0f}%")
    print(f"  Tolerances:       peak={report.tol_peak}  rms={report.tol_rms}  ss={report.tol_ss}")
    print()

    col_w = max(len(r.channel) for r in report.results) + 2
    header = f"  {'Channel':<{col_w}}  {'Peak Err':>12}  {'RMS Err':>12}  {'SS Err':>12}  Status"
    print(header)
    print("  " + "-" * (len(header) - 2))
    for r in report.results:
        row = (
            f"  {r.channel:<{col_w}}"
            f"  {r.peak_error:>12.6g}"
            f"  {r.rms_error:>12.6g}"
            f"  {r.steady_state_error:>12.6g}"
            f"  {r.status.upper()}"
        )
        print(row)
        for reason in r.fail_reasons:
            print(f"  {'':>{col_w + 2}}  → {reason}")

    print()
    print(f"  Overall: {report.overall.upper()}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Verify simulator CSV output against a reference golden dataset."
    )
    p.add_argument("--sim", required=True, help="Path to simulator output CSV.")
    p.add_argument("--ref", required=True, help="Path to reference (golden) CSV.")
    p.add_argument("--tol-peak", type=float, default=0.01,
                   help="Peak absolute error tolerance (default 0.01).")
    p.add_argument("--tol-rms", type=float, default=0.005,
                   help="RMS error tolerance (default 0.005).")
    p.add_argument("--tol-ss", type=float, default=0.002,
                   help="Steady-state mean absolute error tolerance (default 0.002).")
    p.add_argument("--steady-state-frac", type=float, default=0.2,
                   help="Fraction of record end considered steady-state (default 0.2).")
    p.add_argument("--skip-time-column", default="time",
                   help="Name of the time axis column to skip (default 'time').")
    p.add_argument("--json", action="store_true",
                   help="Emit machine-readable JSON report.")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    sim_path = Path(args.sim)
    ref_path = Path(args.ref)

    for path in (sim_path, ref_path):
        if not path.exists():
            print(f"ERROR: File not found: {path}", file=sys.stderr)
            sys.exit(2)

    try:
        report = run_verification(
            sim_path=sim_path,
            ref_path=ref_path,
            tol_peak=args.tol_peak,
            tol_rms=args.tol_rms,
            tol_ss=args.tol_ss,
            steady_state_frac=args.steady_state_frac,
            skip_column=args.skip_time_column,
        )
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(2)

    if args.json:
        print(json.dumps(asdict(report), indent=2))
    else:
        print_report(report)

    sys.exit(0 if report.overall == "pass" else 1)


if __name__ == "__main__":
    main()
