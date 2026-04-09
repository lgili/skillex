#!/usr/bin/env python3
"""Analyze power electronics waveform data from a CSV file.

Performs steady-state detection, then computes RMS, DC, AC-RMS, peak, crest factor,
FFT harmonic decomposition, and THD. All computation uses only the Python standard library.

Usage:
    python analyze_waveform.py --file waveform.csv --channel v_out --fundamental 50
    python analyze_waveform.py --file waveform.csv --channel i_L \\
        --fundamental 100000 --sample-rate 10000000 --window hann --max-harmonics 10
    python analyze_waveform.py --file waveform.csv --channel v_out --fundamental 50 --json
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
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        data: dict[str, list[float]] = {}
        for row in reader:
            for k, v in row.items():
                data.setdefault(k.strip(), []).append(float(v))
    return data


# ---------------------------------------------------------------------------
# Steady-state detection (cycle-by-cycle window comparison)
# ---------------------------------------------------------------------------

def detect_steady_state_start(signal: list[float], tol: float = 0.01) -> int:
    """Return sample index where periodic steady-state begins.

    Compares overlapping windows of adaptive size. Returns the start of the
    first window where two consecutive windows agree within `tol * signal_range`.
    Falls back to the midpoint if no convergence is detected.
    """
    n = len(signal)
    window = max(n // 20, 50)
    sig_range = max(signal) - min(signal) or 1.0
    threshold = tol * sig_range

    for i in range(0, n - 2 * window, window // 2):
        wa = signal[i: i + window]
        wb = signal[i + window: i + 2 * window]
        diff = max(abs(a - b) for a, b in zip(wa, wb))
        if diff <= threshold:
            return i + window

    return n // 2  # fallback


# ---------------------------------------------------------------------------
# Time-domain metrics
# ---------------------------------------------------------------------------

def compute_rms(sig: list[float]) -> float:
    return math.sqrt(sum(x * x for x in sig) / len(sig))


def compute_dc(sig: list[float]) -> float:
    return sum(sig) / len(sig)


def compute_ac_rms(sig: list[float]) -> float:
    rms = compute_rms(sig)
    dc = compute_dc(sig)
    return math.sqrt(max(rms * rms - dc * dc, 0.0))


def compute_peak(sig: list[float]) -> float:
    return max(abs(x) for x in sig)


def compute_crest_factor(sig: list[float]) -> float:
    rms = compute_rms(sig)
    return compute_peak(sig) / rms if rms > 0 else float("inf")


# ---------------------------------------------------------------------------
# FFT (pure Python — no numpy required)
# ---------------------------------------------------------------------------

def _fft(x: list[complex]) -> list[complex]:
    """Radix-2 Cooley-Tukey FFT; falls back to DFT for non-power-of-2 lengths."""
    n = len(x)
    if n <= 1:
        return list(x)
    if n & (n - 1):  # not a power of two
        return _dft(x)
    even = _fft(x[::2])
    odd = _fft(x[1::2])
    half = n // 2
    twiddle = [
        math.cos(-2 * math.pi * k / n) + 1j * math.sin(-2 * math.pi * k / n)
        for k in range(half)
    ]
    return (
        [even[k] + twiddle[k] * odd[k] for k in range(half)]
        + [even[k] - twiddle[k] * odd[k] for k in range(half)]
    )


def _dft(x: list[complex]) -> list[complex]:
    n = len(x)
    return [
        sum(
            x[j] * (math.cos(-2 * math.pi * k * j / n) + 1j * math.sin(-2 * math.pi * k * j / n))
            for j in range(n)
        )
        for k in range(n)
    ]


def _hann(n: int) -> list[float]:
    return [0.5 * (1.0 - math.cos(2.0 * math.pi * i / (n - 1))) for i in range(n)]


def _next_pow2(n: int) -> int:
    p = 1
    while p < n:
        p <<= 1
    return p


def compute_spectrum(
    sig: list[float],
    fs: float,
    apply_window: bool = True,
) -> tuple[list[float], list[float]]:
    """Return (freq_hz[], magnitude[]) from DC to Nyquist.

    Magnitudes are amplitude-corrected (peak, not RMS) and represent
    the physical signal amplitude of each frequency component.
    """
    n = len(sig)

    if apply_window:
        w = _hann(n)
        windowed = [x * wv for x, wv in zip(sig, w)]
        win_amplitude_correction = n / sum(w)
    else:
        windowed = list(sig)
        win_amplitude_correction = 1.0

    n_fft = _next_pow2(n)
    padded: list[complex] = [complex(windowed[i]) if i < n else 0j for i in range(n_fft)]
    spectrum = _fft(padded)

    half = n_fft // 2 + 1
    # Two-sided to one-sided conversion; multiply by 2/n_fft, then apply window correction
    scale = 2.0 * win_amplitude_correction / n_fft
    magnitudes = [abs(spectrum[k]) * scale for k in range(half)]
    magnitudes[0] /= 2.0  # DC bin: no 2x factor
    freqs = [k * fs / n_fft for k in range(half)]
    return freqs, magnitudes


def _nearest_bin(freqs: list[float], target: float) -> int:
    return min(range(len(freqs)), key=lambda i: abs(freqs[i] - target))


def compute_thd(
    magnitudes: list[float],
    freqs: list[float],
    fundamental: float,
    max_harmonics: int = 20,
) -> float:
    """THD = sqrt(sum_h>=2(V_h^2)) / V_1."""
    v1 = magnitudes[_nearest_bin(freqs, fundamental)]
    if v1 == 0.0:
        return float("inf")
    harmonic_sq_sum = 0.0
    for h in range(2, max_harmonics + 1):
        hf = h * fundamental
        if hf > freqs[-1]:
            break
        vh = magnitudes[_nearest_bin(freqs, hf)]
        harmonic_sq_sum += vh * vh
    return math.sqrt(harmonic_sq_sum) / v1


# ---------------------------------------------------------------------------
# Report dataclasses
# ---------------------------------------------------------------------------

@dataclass
class HarmonicLine:
    harmonic: int
    frequency_hz: float
    magnitude: float
    magnitude_pct: float    # relative to fundamental


@dataclass
class WaveformReport:
    file: str
    channel: str
    sample_rate_hz: float
    total_samples: int
    steady_state_start_sample: int
    num_steady_state_samples: int
    rms: float
    dc: float
    ac_rms: float
    peak: float
    crest_factor: float
    thd_pct: float | None
    harmonics: list[HarmonicLine] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------

def analyze(
    data: dict[str, list[float]],
    channel: str,
    fs: float,
    time_col: str,
    fundamental: float | None,
    apply_window: bool,
    max_harmonics: int,
    ss_tol: float,
    file_path: str,
) -> WaveformReport:
    signal = data[channel]
    total = len(signal)

    ss_start = detect_steady_state_start(signal, tol=ss_tol)
    ss = signal[ss_start:]
    if len(ss) < 16:
        ss = signal
        ss_start = 0

    rms = compute_rms(ss)
    dc = compute_dc(ss)
    ac_rms = compute_ac_rms(ss)
    peak = compute_peak(ss)
    crest = compute_crest_factor(ss)

    freqs, mags = compute_spectrum(ss, fs, apply_window=apply_window)

    thd_pct: float | None = None
    harmonics: list[HarmonicLine] = []

    if fundamental is not None:
        thd_pct = round(compute_thd(mags, freqs, fundamental, max_harmonics) * 100, 4)
        v1 = mags[_nearest_bin(freqs, fundamental)]
        for h in range(1, max_harmonics + 1):
            hf = h * fundamental
            if hf > freqs[-1]:
                break
            idx = _nearest_bin(freqs, hf)
            mag = mags[idx]
            pct = (mag / v1 * 100.0) if v1 > 0 else float("nan")
            harmonics.append(HarmonicLine(
                harmonic=h,
                frequency_hz=round(freqs[idx], 3),
                magnitude=round(mag, 9),
                magnitude_pct=round(pct, 3),
            ))

    return WaveformReport(
        file=file_path,
        channel=channel,
        sample_rate_hz=fs,
        total_samples=total,
        steady_state_start_sample=ss_start,
        num_steady_state_samples=len(ss),
        rms=round(rms, 9),
        dc=round(dc, 9),
        ac_rms=round(ac_rms, 9),
        peak=round(peak, 9),
        crest_factor=round(crest, 6),
        thd_pct=thd_pct,
        harmonics=harmonics,
    )


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def print_report(r: WaveformReport) -> None:
    ss_pct = r.steady_state_start_sample / r.total_samples * 100
    print(f"Waveform Analysis — channel: {r.channel}")
    print(f"  File:             {r.file}")
    print(f"  Sample rate:      {r.sample_rate_hz:.6g} Hz")
    print(f"  Total samples:    {r.total_samples}")
    print(f"  Steady-state at:  sample {r.steady_state_start_sample}  ({ss_pct:.1f}%)")
    print(f"  SS samples used:  {r.num_steady_state_samples}")
    print()
    print(f"  RMS:              {r.rms:.6g}")
    print(f"  DC:               {r.dc:.6g}")
    print(f"  AC RMS:           {r.ac_rms:.6g}")
    print(f"  Peak:             {r.peak:.6g}")
    print(f"  Crest factor:     {r.crest_factor:.4f}")
    if r.thd_pct is not None:
        print(f"  THD:              {r.thd_pct:.3f}%")
    if r.harmonics:
        print()
        print(f"  {'H':>3}  {'Freq (Hz)':>12}  {'Magnitude':>14}  {'% Fund':>8}")
        print(f"  {'---':>3}  {'----------':>12}  {'------------':>14}  {'------':>8}")
        for h in r.harmonics:
            print(f"  {h.harmonic:>3}  {h.frequency_hz:>12.4g}  {h.magnitude:>14.6g}  {h.magnitude_pct:>8.3f}%")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Analyze power electronics waveform: RMS, FFT, THD, power quality metrics."
    )
    p.add_argument("--file", required=True, help="CSV file with waveform data.")
    p.add_argument("--channel", required=True, help="Signal column name to analyze.")
    p.add_argument("--time", default="time",
                   help="Time column name for auto-detecting sample rate (default 'time').")
    p.add_argument("--fundamental", type=float, default=None,
                   help="Fundamental frequency in Hz for THD and harmonic table.")
    p.add_argument("--sample-rate", type=float, default=None,
                   help="Sample rate in Hz. Auto-detected from --time column if omitted.")
    p.add_argument("--window", choices=["hann", "none"], default="hann",
                   help="FFT window function (default: hann).")
    p.add_argument("--max-harmonics", type=int, default=20,
                   help="Maximum harmonics to report (default 20).")
    p.add_argument("--ss-tol", type=float, default=0.01,
                   help="Steady-state convergence tolerance as fraction of range (default 0.01).")
    p.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    path = Path(args.file)

    if not path.exists():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        sys.exit(2)

    data = read_csv(path)

    if args.channel not in data:
        available = list(data.keys())
        print(f"ERROR: Channel '{args.channel}' not found. Available: {available}", file=sys.stderr)
        sys.exit(2)

    fs = args.sample_rate
    if fs is None:
        t = data.get(args.time)
        if t and len(t) > 1:
            dt = (t[-1] - t[0]) / (len(t) - 1)
            fs = 1.0 / dt if dt > 0 else None

    if fs is None:
        print(
            "ERROR: Cannot determine sample rate. "
            "Provide --sample-rate or ensure the --time column exists.",
            file=sys.stderr,
        )
        sys.exit(2)

    report = analyze(
        data=data,
        channel=args.channel,
        fs=fs,
        time_col=args.time,
        fundamental=args.fundamental,
        apply_window=(args.window == "hann"),
        max_harmonics=args.max_harmonics,
        ss_tol=args.ss_tol,
        file_path=str(path),
    )

    if args.json:
        print(json.dumps(asdict(report), indent=2))
    else:
        print_report(report)


if __name__ == "__main__":
    main()
