---
name: simulation-verification
description: Verification and validation specialist for open-source power electronics simulators written in C++. Covers benchmark circuit design (from simple RC to full converter), cross-validation against PSIM and SPICE, numerical accuracy analysis, parameter sweep / Monte Carlo studies, and building a regression test infrastructure. Use when verifying simulator correctness, comparing results to references, diagnosing accuracy degradation, or building test suites. Trigger for terms like "verify simulation", "benchmark", "cross-validate", "compare with PSIM", "compare with SPICE", "Monte Carlo", "parameter sweep", "regression test", "accuracy", "error analysis", or "golden dataset".
---

# Simulation Verification

## Overview

Use this skill to establish that the simulator produces correct results and to build the infrastructure that catches regressions. Verification answers "did we build the simulator correctly?" Validation answers "does it simulate real circuits accurately?"

Default stance:

- Start with the simplest possible circuit that exercises each model independently before testing interactions.
- Always compare quantitatively — "looks similar" is not a verification result. Specify tolerance and measure the actual error.
- Cross-validate against SPICE (LTspice, ngspice) or PSIM as the reference, not other custom simulators.
- Regression tests must be automated, deterministic, and fast enough to run on every commit.
- Document failure modes: when and why does the simulator diverge from the reference? Understanding limitations is as important as demonstrating correctness.

## Core Workflow

1. **Design the benchmark hierarchy.**
   - Level 1 (unit): single component — RC charge, RL step, RLC resonance, ideal diode.
   - Level 2 (topology): single converter operating point — buck at 48V/12V, 10A, CCM.
   - Level 3 (dynamics): converter step response — 10A→5A load step, duty cycle perturbation.
   - Level 4 (stress): edge cases — DCM boundary, transformer saturation, heavy harmonic load.
   - Load `references/test-case-design.md` for the benchmark library.

2. **Generate reference data.**
   - Run identical circuits in LTspice or ngspice with small time step (10× finer than simulator).
   - Export CSV: time, node voltages, branch currents.
   - For PSIM: export waveform data file.
   - Load `references/cross-validation.md` for comparison methodology.

3. **Compare and quantify error.**
   - Metrics: peak error, RMS error, steady-state error, phase error (for oscillatory signals).
   - Define pass/fail tolerance per metric per benchmark.
   - Root-cause analysis when tolerance is exceeded.

4. **Parameter sweep and Monte Carlo.**
   - Sweep key parameters (D, f_sw, L, C, load) across expected operating range.
   - Monte Carlo: randomize component tolerances (±10%) over N=100–1000 runs.
   - Verify simulator handles all combinations without diverging.
   - Load `references/numerical-benchmarks.md` for sweep infrastructure.

5. **Build regression test infrastructure.**
   - Store golden datasets (reference outputs) in the repository.
   - Automated test: run simulator → compare to golden → pass/fail with tolerance.
   - Run on every commit (CI pipeline).
   - Load `references/numerical-benchmarks.md` for C++ test framework patterns.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| Test case design | `references/test-case-design.md` | Designing benchmark circuits from simple to complex, defining pass criteria |
| Cross-validation | `references/cross-validation.md` | Comparing to PSIM/SPICE, error metrics, interpreting discrepancies |
| Numerical benchmarks and regression | `references/numerical-benchmarks.md` | Building parameter sweeps, Monte Carlo, and automated regression infrastructure |

## Bundled Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/verify_simulation.py` | Compare simulator CSV output against a reference golden dataset; reports peak error, RMS error, and steady-state error per channel with pass/fail | `python skills/simulation-verification/scripts/verify_simulation.py --sim results/buck.csv --ref golden/buck.csv --tol-peak 0.01` |

## Constraints

### MUST DO

- Define quantitative pass/fail tolerances before running any comparison.
- Use a higher-fidelity reference (10× finer time step in SPICE, or analytical solution) — never compare two simulators of similar fidelity and declare agreement.
- Cover CCM and DCM operating regions in converter benchmarks.
- Include at least one transient test (step response) per converter topology.
- Store golden datasets under version control — regenerate only intentionally.

### MUST NOT DO

- Declare "verified" based on visual waveform comparison alone.
- Use LTspice as the reference with the same time step as the simulator under test.
- Hardcode absolute tolerance that doesn't scale with signal amplitude.
- Run Monte Carlo without a random seed — determinism is required for regression tests.
- Ignore benchmarks that fail — document the failure, set an issue, do not silently skip.

## Output Template

For verification tasks, provide:

1. Test circuit description: topology, component values, operating point.
2. Reference: tool used, settings (time step, solver, tolerance).
3. Comparison metrics: peak error (%), RMS error (%), steady-state error (%).
4. Pass/fail against defined tolerances.
5. If failing: root cause hypothesis and suggested fix.
6. Regression test added: file path, golden data hash, tolerance used.

## Primary References

- Oberkampf & Roy — *Verification and Validation in Scientific Computing* (Cambridge)
- Nagel — *SPICE2: A Computer Program to Simulate Semiconductor Circuits*
- LTspice documentation — Analog Devices
- Suntio, Messo & Puukko — *Power Electronic Converters: Dynamics and Control*
