---
name: waveform-analysis
description: Waveform analysis specialist for power electronics simulators. Covers FFT-based harmonic decomposition, THD, power factor, RMS/average/peak calculations, steady-state detection, and spectral leakage mitigation. Use when processing simulation output waveforms for quality metrics, harmonic content, or determining when the simulation has reached periodic steady state. Trigger for terms like "FFT", "harmonic", "THD", "RMS", "power factor", "steady state", "spectral leakage", "windowing", "DFT", "harmonic distortion", "cycle detection", or "convergence to steady state".
---

# Waveform Analysis

## Overview

Use this skill when the simulation has produced waveform data and needs to be post-processed: extracting RMS values, harmonic content, power quality metrics, or detecting when the simulation has reached a periodic steady state.

Default stance:

- Do not report results until the simulation has reached steady state — transient data pollutes all metrics.
- FFT requires exactly N complete cycles of the periodic signal — windowing or spectral leakage otherwise corrupts the harmonic analysis.
- RMS and average must be computed over complete switching periods, not arbitrary windows.
- THD is defined relative to the fundamental — for inverter output, fundamental is at grid frequency; for converter ripple, fundamental is at switching frequency.
- Always report the frequency resolution and number of cycles used when presenting FFT results.

## Core Workflow

1. **Detect steady state.**
   - Simulation reaches periodic steady state when the waveform at t repeats at t + T_sw (within tolerance).
   - Check both voltage and current waveforms at representative nodes.
   - Load `references/steady-state-detection.md` for cycle-by-cycle comparison method.

2. **Extract the steady-state window.**
   - Capture exactly N complete switching periods (or fundamental periods for inverter output).
   - N should be a power of 2 for FFT efficiency, but correctness requires integer periods.
   - Record sample rate and verify: N_samples = N_periods × samples_per_period.

3. **Compute RMS, average, and peak.**
   - RMS: sqrt(mean(v²)) over complete periods.
   - Average: mean(v) — equals DC component.
   - AC RMS: sqrt(RMS² − average²).
   - Load `references/power-quality-metrics.md` for exact formulas.

4. **Apply FFT.**
   - Apply window function if waveform is not exactly periodic in the captured window (Hann for general use).
   - Compute FFT and extract magnitude/phase of each harmonic.
   - Identify fundamental frequency and harmonics.
   - Load `references/spectral-analysis.md` for FFT setup and interpretation.

5. **Compute power quality metrics.**
   - THD, TDD, power factor, crest factor, displacement power factor.
   - For grid-connected inverters: comply with IEC 61000-3-2 or IEEE 519 harmonic limits.
   - Load `references/power-quality-metrics.md` for metric definitions and limits.

6. **Report results.**
   - Harmonic spectrum: frequency, magnitude (in physical units and % of fundamental), phase.
   - Summary metrics: RMS, DC, THD, PF, crest factor.
   - Steady-state error vs. setpoint.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| FFT and spectral analysis | `references/spectral-analysis.md` | Setting up FFT, windowing, identifying harmonics, interpreting spectra |
| Steady-state detection | `references/steady-state-detection.md` | Detecting convergence to periodic steady state in simulation output |
| Power quality metrics | `references/power-quality-metrics.md` | Computing THD, power factor, DPF, crest factor, or checking against standards |

## Bundled Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/analyze_waveform.py` | Detect steady state, compute RMS/DC/AC-RMS/peak/crest factor, FFT harmonic decomposition, and THD from a CSV waveform file | `python skills/waveform-analysis/scripts/analyze_waveform.py --file waveform.csv --channel v_out --fundamental 50` |

## Constraints

### MUST DO

- Confirm steady state before computing any metric — transients give meaningless results.
- Use integer number of complete fundamental periods in FFT window.
- Report frequency resolution (f_res = f_fundamental / N_cycles) with FFT results.
- Apply a window function when the captured record is not an exact integer number of fundamental periods.
- Clearly distinguish DC component from AC ripple in all RMS calculations.

### MUST NOT DO

- Report THD before confirming steady state.
- Use a non-integer number of fundamental periods in the DFT window without windowing.
- Confuse switching frequency harmonics with fundamental harmonics in inverter output analysis.
- Ignore spectral leakage when fundamental frequency is not exactly aligned to FFT bin.
- Report RMS over a partial period — always use complete periods for accuracy.

## Output Template

For waveform analysis tasks, provide:

1. Steady-state confirmation: method used, convergence tolerance, how many cycles verified.
2. Sampling parameters: f_sample, N_samples, N_periods captured.
3. Spectrum: fundamental frequency, dominant harmonics (frequency, magnitude, phase, % of fundamental).
4. Summary metrics: V_rms, V_dc, I_rms, THD_V, THD_I, PF, crest factor.
5. Comparison to target or standard (if applicable).

## Primary References

- Lyons — *Understanding Digital Signal Processing* (3rd ed.)
- Harris — *On the Use of Windows for Harmonic Analysis with the DFT*, IEEE Proc. 1978
- IEC 61000-4-7 — Testing and measurement techniques: harmonics and interharmonics measurement
- IEEE 519-2022 — Harmonic Control in Electric Power Systems
