---
name: power-electronics
description: Power electronics specialist for converter topologies (buck, boost, flyback, full-bridge, LLC, DAB), CCM/DCM boundary analysis, state-space averaging, and small-signal models in a C++ discrete-time simulator. Use when working on converter models, switching waveform analysis, duty-cycle control loops, or loss estimation. Trigger for terms like "buck converter", "boost", "flyback", "LLC", "CCM", "DCM", "small-signal", "state-space averaging", "PWM switch", "Bode", "converter losses", "switching frequency", or "power stage".
---

# Power Electronics

## Overview

Use this skill when designing, implementing, reviewing, or debugging converter models inside a discrete-time power electronics simulator (C++). It covers topology behavior, operating mode transitions, loss mechanisms, and the mathematical foundations needed to build accurate simulation models.

Default stance:

- Derive steady-state operating points before building dynamic models.
- Distinguish CCM and DCM behavior explicitly — boundary conditions set ripple current and transfer functions.
- Use state-space averaging as the canonical method for small-signal models; verify with harmonic balance when averaging assumptions break down.
- Loss estimation (switching, conduction, magnetic) must accompany any efficiency or thermal claim.
- In a discrete-time simulator, every model choice has a time-step dependency — call it out.

## Core Workflow

1. **Identify the topology and operating point.**
   - Determine power stage topology (isolated vs. non-isolated, unidirectional vs. bidirectional).
   - Compute nominal duty cycle D, voltage conversion ratio M(D), and inductor/capacitor values from ripple specs.
   - Check boundary duty cycle D_crit to determine CCM vs. DCM at the given load.

2. **Model steady-state waveforms.**
   - Derive inductor current waveform (linear ramp in each subinterval).
   - Identify subinterval states and their durations (D·Ts, (1−D)·Ts, and dead-time for DCM).
   - Compute average values: ⟨i_L⟩, ⟨v_C⟩, input/output power balance.

3. **Build the dynamic model.**
   - Apply state-space averaging across CCM subintervals to obtain A, B, C, D matrices.
   - Perturb duty cycle d̂ and input v̂_g around the operating point to derive transfer functions.
   - Key transfer functions: control-to-output G_vd(s), line-to-output G_vg(s), input impedance Z_in(s).

4. **Implement in the C++ simulator.**
   - Represent each converter subinterval as a distinct circuit netlist state handed to the MNA solver.
   - Switch states at the computed switching instants (not just at sample boundaries).
   - Load `references/converter-topologies.md` for stamp-level details per topology.

5. **Validate against analytical predictions.**
   - Compare simulated average ⟨v_out⟩, ⟨i_L⟩, ripple, and efficiency to hand-calculated values.
   - Plot control-to-output frequency response and compare to small-signal model.
   - Load `references/small-signal-models.md` for verification methodology.

6. **Account for losses and non-idealities.**
   - Add MOSFET Rds_on, diode forward voltage, and inductor DCR to the netlist stamps.
   - Estimate switching losses from device datasheet parameters (E_on, E_off, Q_rr).
   - Load `references/ccm-dcm-analysis.md` for boundary conditions and DCM corrections.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| Converter topologies | `references/converter-topologies.md` | Implementing or reviewing buck, boost, buck-boost, flyback, full-bridge, LLC, or DAB models |
| CCM/DCM analysis | `references/ccm-dcm-analysis.md` | Analyzing operating mode boundaries, discontinuous current waveforms, or DCM transfer functions |
| Small-signal models | `references/small-signal-models.md` | Deriving or verifying state-space averaged models, Bode plots, or loop gain analysis |

## Constraints

### MUST DO

- Specify the operating mode (CCM or DCM) explicitly before analyzing waveforms or transfer functions.
- Include all major parasitics (Rds_on, DCR, ESR) in efficiency and ripple calculations.
- Document switching frequency and time-step relationship when implementing in the simulator.
- State which subintervals exist and their state equations before deriving average models.
- Validate converter models against known analytical results or reference simulations.

### MUST NOT DO

- Apply CCM transfer functions when the converter operates in DCM — the small-signal model changes fundamentally.
- Ignore dead-time in synchronous converters; it creates a DCM-like subinterval that affects gain.
- Assume ideal switches when estimating efficiency; conduction and switching losses must be accounted for.
- Confuse instantaneous and averaged waveforms — clearly distinguish which domain you are working in.
- Skip operating point analysis before building a dynamic model.

## Output Template

For converter modeling tasks, provide:

1. Topology identification and key parameters (V_in, V_out, f_sw, L, C, load range).
2. Operating mode determination (CCM/DCM boundary, D_crit).
3. Steady-state equations and waveform derivation.
4. Small-signal transfer functions (G_vd, G_vg) with dominant poles and zeros.
5. Loss breakdown (conduction, switching, magnetic) and estimated efficiency.
6. Simulator implementation notes (subinterval switching, time-step constraints).

## Primary References

- Erickson & Maksimovic — *Fundamentals of Power Electronics* (3rd ed.)
- Mohan, Undeland & Robbins — *Power Electronics: Converters, Applications, and Design*
- Middlebrook & Cuk — *A General Unified Approach to Modeling Switching-Converter Power Stages* (PESC 1976)
- Texas Instruments — *Designing Type-II and Type-III Compensators*
