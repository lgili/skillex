---
name: solver-numerics
description: Numerical methods specialist for discrete-time power electronics simulation engines written in C++. Covers time integration methods (trapezoidal, backward Euler, GEAR/BDF), Newton-Raphson convergence for nonlinear circuits, local truncation error control, step-size selection, and sparse linear algebra (Eigen, UMFPACK). Use when debugging non-convergence, oscillatory solutions, numerical damping issues, stiff circuit behavior, or slow simulation speed. Trigger for terms like "convergence", "Newton-Raphson", "trapezoidal", "backward Euler", "GEAR", "BDF", "time step", "LTE", "stiff", "numerical oscillation", "damped Tustin", "Runge-Kutta", "sparse solver", "Eigen sparse", or "factorization".
---

# Solver Numerics

## Overview

Use this skill when the simulation engine's numerical core needs to be understood, debugged, or improved. This covers the time-marching loop, the integration scheme for dynamic elements (L, C), Newton-Raphson iteration for nonlinear elements, convergence detection, and the sparse linear algebra that solves the MNA system at each step.

Default stance:

- Trapezoidal rule is the default integration method: 2nd-order accurate, A-stable, widely used in SPICE. Use it unless numerical oscillation (ringing) is observed, in which case switch to backward Euler or apply damping.
- Newton-Raphson is the standard for nonlinear circuits. Convergence must be verified against tight tolerances (SPICE-style: |Δv| < ε_abs + ε_rel·|v|).
- Stiff circuits (fast and slow dynamics together) need implicit methods — explicit Euler diverges.
- In a discrete-time simulator with fixed switching events, the time step must align to or detect switching instants.
- Simulation speed is dominated by LU factorization — exploit sparsity and factor once per topology change.

## Core Workflow

1. **Choose the integration method.**
   - Default: trapezoidal (good accuracy, A-stable, no numerical damping for oscillatory circuits).
   - If numerical ringing after switching transients: switch to backward Euler locally or use LIM (Latency-Insertion Method) damping.
   - If stiff system with very different time constants: consider GEAR-2 (BDF-2) for better stability.
   - Load `references/numerical-integration.md` for method equations and companion models.

2. **Set up the time-marching loop.**
   - Fixed time step h (simplest for discrete-time simulator with deterministic switching).
   - At each switching instant, either: (a) align h to the event, or (b) interpolate state and restart.
   - Advancing through subintervals: h is typically a fraction of the switching period (e.g., T_sw/1000 for a 100 kHz converter with step h = 10 ns).

3. **Solve the linearized system.**
   - Assemble Y·x = J from component stamps (see `circuit-solver` skill).
   - If linear circuit (no NL elements): factor Y once per topology, reuse for all steps.
   - If nonlinear (diodes, saturable inductors, MOSFETs in saturation): apply Newton-Raphson per step.
   - Load `references/newton-raphson.md` for NR loop structure and convergence criteria.

4. **Handle convergence failure.**
   - NR did not converge → reduce time step (if adaptive) or add damping (source stepping, GMIN stepping).
   - Check for zero or near-zero Jacobian diagonal entries (model errors often manifest here).
   - Load `references/newton-raphson.md` for diagnostic and recovery strategies.

5. **Validate numerical accuracy.**
   - Compare simulation output to analytical solution (e.g., RC step response, LC resonance).
   - Check energy conservation: input power − output power − losses = d/dt(stored energy).
   - Verify that halving the time step does not change results by more than the expected LTE.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| Integration methods | `references/numerical-integration.md` | Implementing or comparing trapezoidal, backward Euler, GEAR, or Runge-Kutta methods |
| Newton-Raphson iteration | `references/newton-raphson.md` | Implementing NR loop, diagnosing convergence failure, or tuning damping strategies |
| Sparse linear solvers | `references/sparse-linear-solvers.md` | Choosing and using Eigen SparseLU, UMFPACK, or other factorization backends |

## Constraints

### MUST DO

- Use implicit integration methods (trapezoidal, backward Euler) — explicit methods are unstable for stiff circuits.
- Apply SPICE-style convergence criteria: |Δv_k| < ε_abs + ε_rel·|v_k| for all unknowns.
- Re-factor the matrix whenever the circuit topology changes (switch event or nonlinear re-stamp).
- Track and use the history state (previous inductor currents, capacitor voltages) correctly across time steps.
- Test integration accuracy against known analytical solutions (RC, RL, RLC step response).

### MUST NOT DO

- Use forward/explicit Euler for dynamic elements in power circuits — it diverges for practical step sizes.
- Share LU factors across topology changes — the matrix changes, so factors must be recomputed.
- Use absolute convergence criteria only — relative criteria are essential for circuits with large dynamic range.
- Ignore numerical oscillations (ringing) — they indicate method mismatch or step size issue, not circuit behavior.
- Forget to store the integration history state correctly across steps — this is the most common source of wrong transient waveforms.

## Output Template

For solver numerics tasks, provide:

1. Integration method in use and why it was chosen (or should be changed).
2. Time step h and its relationship to the fastest dynamics (switching period, LC resonance).
3. Newton-Raphson configuration: max iterations, convergence tolerances, damping strategy.
4. Sparse solver choice and factorization strategy (when to re-factor vs. reuse).
5. Convergence test design: what analytical case to use and what tolerance to expect.
6. Identified numerical problem and proposed fix (oscillation → damping, divergence → smaller step, etc.).

## Primary References

- Gear — *Numerical Initial Value Problems in Ordinary Differential Equations*
- Hairer, Norsett & Wanner — *Solving Ordinary Differential Equations I* (non-stiff)
- Hairer & Wanner — *Solving Ordinary Differential Equations II* (stiff, includes BDF)
- Nagel — *SPICE2: A Computer Program to Simulate Semiconductor Circuits* (UCB/ERL M520)
- Davis — *Direct Methods for Sparse Linear Systems* (covers UMFPACK, AMD)
