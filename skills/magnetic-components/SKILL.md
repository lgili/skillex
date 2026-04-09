---
name: magnetic-components
description: Magnetic component modeling specialist for non-ideal transformers, coupled inductors, saturation, B-H hysteresis curves, and Steinmetz core loss in a C++ discrete-time power electronics simulator. Use when implementing or reviewing transformer models, inductor saturation behavior, leakage inductance effects, or magnetic core losses. Trigger for terms like "transformer model", "leakage inductance", "magnetizing inductance", "saturation", "B-H curve", "core loss", "Steinmetz", "coupled inductor", "flux linkage", or "non-ideal magnetic".
---

# Magnetic Components

## Overview

Use this skill when building, reviewing, or debugging magnetic component models — transformers, coupled inductors, and saturable inductors — inside a C++ discrete-time power electronics simulator.

Default stance:

- Represent transformers with their full equivalent circuit (L_m, L_lk_p, L_lk_s, R_core, R_winding) — ideal transformer models miss key dynamics.
- Saturation is a nonlinear inductor problem; model it with a piecewise-linear or analytical B-H function evaluated at each time step.
- Core loss (hysteresis + eddy current) contributes to both efficiency error and thermal design — include it.
- Always refer inductance values to the same winding; mixing referred and unreferred values is the most common source of stamp errors.
- Validate magnetic models with volt-second balance (flux must return to the same value every steady-state cycle).

## Core Workflow

1. **Define the magnetic circuit parameters.**
   - Identify core geometry: cross-sectional area A_c, mean magnetic path length l_c, N turns per winding.
   - Determine material: saturation flux density B_sat, relative permeability μ_r, Steinmetz parameters k, α, β.
   - Compute: L = μ_0·μ_r·N²·A_c/l_c (unsaturated inductance), B_pk = L·i_pk/(N·A_c).

2. **Build the equivalent circuit.**
   - Two-winding transformer: T-equivalent (L_lk_p, L_m, L_lk_s referred to primary, R_winding, R_core in parallel with L_m).
   - Compute all referred values: L_lk_s' = n²·L_lk_s, R_L_s' = n²·R_L_s, where n = N_p/N_s.
   - Load `references/transformer-models.md` for full parameter extraction procedure.

3. **Model saturation.**
   - Check if B_pk approaches B_sat at any operating point.
   - Replace the linear L_m with a nonlinear inductance: L_m(i) = dλ/di = N·A_c · dB/dH(i/(N/l_c)).
   - Implement as a piecewise-linear B-H lookup or an analytical model (e.g., Jiles-Atherton).
   - Load `references/core-saturation.md` for saturation models and detection criteria.

4. **Implement MNA stamps.**
   - Non-ideal transformer: decompose into coupled inductors (L_m) + leakage inductances + voltage-controlled voltage sources for turns ratio.
   - For saturable L_m: use a nonlinear current-dependent inductor stamp; Newton-Raphson iteration required.
   - Load `references/coupled-inductor-stamps.md` for the exact stamp matrices.

5. **Estimate core losses.**
   - Apply Steinmetz equation: P_core = k·f^α·B_pk^β · Vol_core.
   - For non-sinusoidal excitation (switching waveforms), use modified Steinmetz (MSE) or improved Steinmetz (iGSE).
   - iGSE: P_core = k_i/T · ∮|dB/dt|^α · ΔB^(β−α) dt.

6. **Validate.**
   - Verify volt-second balance: ∮v_L dt = 0 per steady-state cycle.
   - Check flux density never exceeds B_sat in simulation (add assertion or alarm in the solver).
   - Compare copper + core loss against efficiency measurement or reference simulation.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| Transformer equivalent circuit | `references/transformer-models.md` | Deriving parameters, building equivalent circuit, or extracting L_m/L_lk from datasheet |
| Core saturation modeling | `references/core-saturation.md` | Modeling nonlinear B-H, detecting saturation in simulation, or implementing piecewise-linear inductance |
| Coupled-inductor MNA stamps | `references/coupled-inductor-stamps.md` | Writing C++ MNA stamps for transformers, coupled inductors, or nonlinear inductors |

## Constraints

### MUST DO

- Always refer all impedances to the same winding before writing MNA stamps.
- Include leakage inductance — it causes voltage spikes at switch turn-off and is critical for LLC tank design.
- Check B_pk ≤ B_sat at all operating points, including transient startup and overload.
- Use iGSE for core loss estimation with switching (non-sinusoidal) waveforms; plain Steinmetz overestimates.
- Validate with volt-second balance check every steady-state cycle in simulation.

### MUST NOT DO

- Use an ideal transformer model (just turns ratio) for any analysis that includes leakage, saturation, or core loss.
- Forget to update the nonlinear inductor stamp after each Newton-Raphson iteration — saturation makes it iteration-dependent.
- Mix referred and unreferred values in the same stamp row/column.
- Apply the Steinmetz equation to DC-biased cores without accounting for the shifted B-H operating point.
- Ignore the air-gap contribution to inductance in gapped cores: L_gap = μ_0·N²·A_c/l_g.

## Output Template

For magnetic component modeling tasks, provide:

1. Core and winding parameters (geometry, material, turns, wire gauge).
2. Equivalent circuit with all referred values.
3. Saturation check: B_pk at nominal and peak current vs. B_sat.
4. MNA stamp structure (which rows/columns affected, with/without nonlinear terms).
5. Core loss estimate (Steinmetz or iGSE) and copper loss breakdown.
6. Validation criteria (volt-second balance, flux waveform shape, loss budget).

## Primary References

- Kazimierczuk — *High-Frequency Magnetic Components* (2nd ed.)
- Erickson & Maksimovic — *Fundamentals of Power Electronics*, Chapter 13–14
- Jiles & Atherton — *Theory of ferromagnetic hysteresis*, J. Magn. Magn. Mater. 61 (1986)
- Venkatachalam et al. — *Accurate prediction of ferrite core loss with nonsinusoidal waveforms*, COMPEL 2002
