#!/usr/bin/env python3
"""Discrete-time stability analysis for digital control loops.

Evaluates the open-loop gain T(z) = C(z) * P(z) * z^(-d) on the unit circle
and computes gain margin, phase margin, and crossover frequencies.
All computation uses only the Python standard library.

Transfer function coefficients are specified as space-separated strings of
polynomial coefficients in descending order of z-power, matching standard
z-domain convention (highest power first).

Usage:
    # First-order plant 1/(z - 0.8), proportional compensator gain=2, Ts=20us:
    python run_stability_analysis.py \\
        --plant-num "1" --plant-den "1 -0.8" \\
        --comp-num "2" --comp-den "1" \\
        --Ts 2e-5 --delay-samples 1

    # Type-II compensator with prewarped Tustin poles/zeros:
    python run_stability_analysis.py \\
        --plant-num "0.1 0.05" --plant-den "1 -1.7 0.72" \\
        --comp-num "1.2 -1.1" --comp-den "1 -1.0" \\
        --Ts 1e-5 --delay-samples 1 --bode

    # Machine-readable output:
    python run_stability_analysis.py ... --json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import asdict, dataclass, field


# ---------------------------------------------------------------------------
# Polynomial / transfer function evaluation
# ---------------------------------------------------------------------------

def polyval(coeffs: list[float], z: complex) -> complex:
    """Evaluate polynomial using Horner's method."""
    result: complex = 0j
    for c in coeffs:
        result = result * z + c
    return result


def tf_eval(num: list[float], den: list[float], z: complex) -> complex:
    d = polyval(den, z)
    if abs(d) < 1e-300:
        return complex(float("inf"), 0.0)
    return polyval(num, z) / d


def delay_eval(n_samples: int, z: complex) -> complex:
    """Evaluate z^(-n_samples)."""
    if abs(z) < 1e-300:
        return complex(float("inf"), 0.0)
    return 1.0 / (z ** n_samples)


def open_loop_eval(
    comp_num: list[float], comp_den: list[float],
    plant_num: list[float], plant_den: list[float],
    delay_samples: int,
    z: complex,
) -> complex:
    return tf_eval(comp_num, comp_den, z) * tf_eval(plant_num, plant_den, z) * delay_eval(delay_samples, z)


# ---------------------------------------------------------------------------
# Bode evaluation on the unit circle  z = e^(j*omega*Ts)
# ---------------------------------------------------------------------------

def compute_bode(
    comp_num: list[float], comp_den: list[float],
    plant_num: list[float], plant_den: list[float],
    delay_samples: int,
    Ts: float,
    n_points: int = 2000,
) -> tuple[list[float], list[float], list[float]]:
    """Return (freq_hz[], mag_db[], phase_deg[]) sweeping [near-DC, f_Nyquist]."""
    omega_nyq = math.pi / Ts
    freqs: list[float] = []
    mags_db: list[float] = []
    phases_deg: list[float] = []

    for i in range(1, n_points + 1):
        omega = omega_nyq * i / n_points
        z = complex(math.cos(omega * Ts), math.sin(omega * Ts))
        g = open_loop_eval(comp_num, comp_den, plant_num, plant_den, delay_samples, z)
        mag = abs(g)
        phase = math.atan2(g.imag, g.real) * 180.0 / math.pi
        freqs.append(omega / (2.0 * math.pi))
        mags_db.append(20.0 * math.log10(mag) if mag > 1e-300 else -float("inf"))
        phases_deg.append(phase)

    return freqs, mags_db, phases_deg


# ---------------------------------------------------------------------------
# Phase unwrapping
# ---------------------------------------------------------------------------

def unwrap_phase(phases: list[float]) -> list[float]:
    unwrapped = [phases[0]]
    for i in range(1, len(phases)):
        diff = phases[i] - unwrapped[-1]
        # Wrap diff to (-180, 180]
        diff = (diff + 180.0) % 360.0 - 180.0
        unwrapped.append(unwrapped[-1] + diff)
    return unwrapped


# ---------------------------------------------------------------------------
# Crossover detection (linear interpolation between samples)
# ---------------------------------------------------------------------------

def find_gain_crossover(
    freqs: list[float], mags_db: list[float]
) -> tuple[float, int]:
    """Find first frequency where |T(z)| crosses 0 dB from above."""
    for i in range(len(mags_db) - 1):
        if mags_db[i] >= 0.0 > mags_db[i + 1]:
            span = mags_db[i] - mags_db[i + 1]
            frac = mags_db[i] / span if span != 0.0 else 0.5
            return freqs[i] + frac * (freqs[i + 1] - freqs[i]), i
    return float("nan"), -1


def find_phase_crossover(
    freqs: list[float], phases_unwrapped: list[float]
) -> tuple[float, int]:
    """Find first frequency where unwrapped phase crosses -180°."""
    for i in range(len(phases_unwrapped) - 1):
        if phases_unwrapped[i] >= -180.0 > phases_unwrapped[i + 1]:
            span = phases_unwrapped[i] - phases_unwrapped[i + 1]
            frac = (phases_unwrapped[i] + 180.0) / span if span != 0.0 else 0.5
            return freqs[i] + frac * (freqs[i + 1] - freqs[i]), i
    return float("nan"), -1


# ---------------------------------------------------------------------------
# Report dataclass
# ---------------------------------------------------------------------------

@dataclass
class StabilityReport:
    Ts: float
    fs_hz: float
    f_nyquist_hz: float
    delay_samples: int
    comp_num: list[float]
    comp_den: list[float]
    plant_num: list[float]
    plant_den: list[float]
    gain_crossover_hz: float | None
    phase_margin_deg: float | None
    phase_crossover_hz: float | None
    gain_margin_db: float | None
    stable: bool | None
    verdict: str
    bode: list[dict] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------

def run_stability_analysis(
    comp_num: list[float], comp_den: list[float],
    plant_num: list[float], plant_den: list[float],
    delay_samples: int,
    Ts: float,
    n_points: int = 2000,
    include_bode: bool = False,
) -> StabilityReport:
    freqs, mags_db, phases_deg = compute_bode(
        comp_num, comp_den, plant_num, plant_den, delay_samples, Ts, n_points
    )
    phases_uw = unwrap_phase(phases_deg)

    gc_hz, gc_idx = find_gain_crossover(freqs, mags_db)
    pc_hz, pc_idx = find_phase_crossover(freqs, phases_uw)

    pm: float | None = None
    gm: float | None = None

    if not math.isnan(gc_hz) and gc_idx >= 0:
        pm = round(180.0 + phases_uw[gc_idx], 2)

    if not math.isnan(pc_hz) and pc_idx >= 0:
        gm = round(-mags_db[pc_idx], 2)

    if pm is not None and gm is not None:
        stable = pm > 0.0 and gm > 0.0
        verdict = f"{'STABLE' if stable else 'UNSTABLE'} — PM = {pm}°  GM = {gm} dB"
    elif pm is not None:
        stable = pm > 0.0
        verdict = f"{'STABLE' if stable else 'UNSTABLE'} — PM = {pm}°  (no phase crossover in [0, f_Nyquist])"
    else:
        stable = None
        verdict = "INDETERMINATE — gain does not cross 0 dB in [0, f_Nyquist]"

    bode_data: list[dict] = []
    if include_bode:
        bode_data = [
            {"freq_hz": round(f, 4), "mag_db": round(m, 4), "phase_deg": round(ph, 4)}
            for f, m, ph in zip(freqs, mags_db, phases_deg)
        ]

    return StabilityReport(
        Ts=Ts,
        fs_hz=round(1.0 / Ts, 4),
        f_nyquist_hz=round(0.5 / Ts, 4),
        delay_samples=delay_samples,
        comp_num=comp_num,
        comp_den=comp_den,
        plant_num=plant_num,
        plant_den=plant_den,
        gain_crossover_hz=round(gc_hz, 4) if not math.isnan(gc_hz) else None,
        phase_margin_deg=pm,
        phase_crossover_hz=round(pc_hz, 4) if not math.isnan(pc_hz) else None,
        gain_margin_db=gm,
        stable=stable,
        verdict=verdict,
        bode=bode_data,
    )


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def print_report(r: StabilityReport) -> None:
    print("Discrete-Time Stability Analysis")
    print(f"  Ts = {r.Ts:.4g} s  |  fs = {r.fs_hz:.4g} Hz  |  f_Nyquist = {r.f_nyquist_hz:.4g} Hz")
    print(f"  Computational delay: {r.delay_samples} sample(s)")
    print(f"  C(z)  num: {r.comp_num}   den: {r.comp_den}")
    print(f"  P(z)  num: {r.plant_num}   den: {r.plant_den}")
    print()
    print(f"  Gain crossover:   {f'{r.gain_crossover_hz:.4g} Hz' if r.gain_crossover_hz is not None else 'not found'}")
    print(f"  Phase margin:     {f'{r.phase_margin_deg:.2f}°' if r.phase_margin_deg is not None else 'N/A'}")
    print(f"  Phase crossover:  {f'{r.phase_crossover_hz:.4g} Hz' if r.phase_crossover_hz is not None else 'not found'}")
    print(f"  Gain margin:      {f'{r.gain_margin_db:.2f} dB' if r.gain_margin_db is not None else 'N/A'}")
    print()
    print(f"  Verdict: {r.verdict}")


def print_bode_table(r: StabilityReport) -> None:
    if not r.bode:
        return
    print()
    print(f"  {'Freq (Hz)':>14}  {'Mag (dB)':>10}  {'Phase (deg)':>12}")
    print(f"  {'-' * 14}  {'-' * 10}  {'-' * 12}")
    step = max(1, len(r.bode) // 40)
    for row in r.bode[::step]:
        print(f"  {row['freq_hz']:>14.4g}  {row['mag_db']:>10.3f}  {row['phase_deg']:>12.3f}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_coeffs(s: str) -> list[float]:
    return [float(x) for x in s.split()]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Discrete-time open-loop stability analysis: phase margin, gain margin."
    )
    p.add_argument("--plant-num", required=True,
                   help="Plant P(z) numerator coefficients (space-separated, highest z-power first).")
    p.add_argument("--plant-den", required=True,
                   help="Plant P(z) denominator coefficients.")
    p.add_argument("--comp-num", default="1",
                   help="Compensator C(z) numerator coefficients (default '1' = unity).")
    p.add_argument("--comp-den", default="1",
                   help="Compensator C(z) denominator coefficients (default '1').")
    p.add_argument("--Ts", type=float, required=True,
                   help="Sample period in seconds.")
    p.add_argument("--delay-samples", type=int, default=1,
                   help="Computational delay in samples (default 1).")
    p.add_argument("--n-points", type=int, default=2000,
                   help="Frequency sweep resolution (default 2000).")
    p.add_argument("--bode", action="store_true",
                   help="Include Bode plot data in output.")
    p.add_argument("--json", action="store_true",
                   help="Emit machine-readable JSON.")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    comp_num = parse_coeffs(args.comp_num)
    comp_den = parse_coeffs(args.comp_den)
    plant_num = parse_coeffs(args.plant_num)
    plant_den = parse_coeffs(args.plant_den)

    report = run_stability_analysis(
        comp_num=comp_num,
        comp_den=comp_den,
        plant_num=plant_num,
        plant_den=plant_den,
        delay_samples=args.delay_samples,
        Ts=args.Ts,
        n_points=args.n_points,
        include_bode=args.bode,
    )

    if args.json:
        print(json.dumps(asdict(report), indent=2))
    else:
        print_report(report)
        if args.bode:
            print_bode_table(report)

    if report.stable is False:
        sys.exit(1)


if __name__ == "__main__":
    main()
