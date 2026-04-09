---
name: control-loop
description: Digital control loop specialist for discrete-time power electronics simulators in C++. Covers Z-domain design and discretization (ZOH, Tustin, matched pole-zero), computational delay modeling, PID and type-II/III compensators, anti-windup, and digital PWM generation. Use when implementing or debugging voltage-mode or current-mode control loops in simulation. Trigger for terms like "digital control", "Z-domain", "ZOH", "Tustin", "bilinear", "PID", "compensator", "computational delay", "anti-windup", "voltage mode", "current mode", "duty cycle update", "discrete-time controller", or "control loop stability".
---

# Control Loop

## Overview

Use this skill when implementing, debugging, or analyzing control loops in a discrete-time power electronics simulator. The simulator advances in discrete time steps — the controller runs at the switching frequency (or a sub-harmonic) and updates duty cycle once per period.

Key difference from continuous-time analysis: a digital controller introduces computational delay (one sample period between measurement and duty cycle update), which adds a phase lag of e^(−sT_s). This phase lag **must** be accounted for in stability analysis and compensator design.

Default stance:

- Model the digital controller in the Z-domain — do not use a continuous-time approximation and then discretize blindly.
- Include one-sample computational delay in the open-loop model when designing the compensator.
- Implement controllers using difference equations derived from Z-domain transfer functions (not from s-domain forms directly).
- Anti-windup is mandatory for any integrating action — saturation without it causes transient overshoot.
- Validate stability: compute discrete-time loop gain T(z), verify PM and GM from the Z-domain Bode plot.

## Core Workflow

1. **Design in continuous time, then discretize.**
   - Design compensator G_c(s) using the power stage model G_vd(s).
   - Target: PM > 45°, GM > 10 dB, f_c < f_sw/5.
   - Account for computational delay in continuous model: add e^(−sT_s) to open-loop gain.
   - Load `references/pid-and-compensators.md` for compensator forms and design equations.

2. **Discretize the compensator.**
   - Preferred method: Tustin (bilinear) with frequency prewarping at crossover frequency.
   - Alternative: ZOH (exact for step-input discretization of plant).
   - Implement as difference equation: y[n] = b0·e[n] + b1·e[n-1] + b2·e[n-2] − a1·y[n-1] − a2·y[n-2].
   - Load `references/digital-control.md` for discretization formulas and Z-transform pairs.

3. **Model computational delay.**
   - Between ADC sample and PWM update, the DSP computes the control law — typically 1 sample period.
   - In the simulator: duty cycle updated at t_n takes effect at t_{n+1} (one step delay).
   - Add ZOH model of delay: D(z) = z^{-1} for one-cycle computational delay.

4. **Implement the discrete-time control law in C++.**
   - Maintain state buffers: previous error values e[n-1], e[n-2], previous output y[n-1], y[n-2].
   - Update once per switching period at the sampling instant.
   - Apply output saturation and anti-windup.
   - Load `references/digital-control.md` for the difference equation implementation pattern.

5. **Verify digital PWM generation.**
   - Duty cycle from controller → PWM comparator comparison each time step.
   - In discrete-time simulator: compare D to a triangular carrier; switch fires at the computed instant.
   - Handle sub-period resolution: if time step h is coarser than required, interpolate switch timing.

6. **Validate loop stability.**
   - Compute open-loop gain T(z) = G_c(z) · G_vd_z(z) · H_m · H_v.
   - Plot Nyquist or Bode in Z-domain (substitute z = e^{jωTs}).
   - Compare simulated step response to theoretical: overshoot % ↔ PM, settling time ↔ bandwidth.
   - Load `references/average-state-space.md` for plant model discretization.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| Digital control and discretization | `references/digital-control.md` | Z-domain design, ZOH/Tustin formulas, difference equation implementation |
| PID and compensators | `references/pid-and-compensators.md` | Type-I/II/III compensator design, anti-windup, current-mode control |
| Averaged state-space plant models | `references/average-state-space.md` | Discretizing the power stage model for Z-domain loop gain analysis |

## Bundled Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/run_stability_analysis.py` | Evaluate open-loop gain T(z) = C(z)·P(z)·z⁻ᵈ on the unit circle; compute phase margin, gain margin, and crossover frequencies from z-domain polynomial coefficients | `python skills/control-loop/scripts/run_stability_analysis.py --plant-num "1" --plant-den "1 -0.8" --comp-num "2" --comp-den "1" --Ts 2e-5` |

## Constraints

### MUST DO

- Include one-sample computational delay in all stability margin calculations.
- Use Tustin with prewarping at f_c for compensator discretization (better phase match near crossover).
- Implement anti-windup for all integrating control actions — especially important during startup and overload.
- Sample the output voltage (and inductor current for current-mode) at a consistent instant within the switching period.
- Validate the discrete-time controller against the continuous-time design: step response, bandwidth, PM.

### MUST NOT DO

- Apply continuous-time stability margins without accounting for computational delay and ZOH effects.
- Use forward Euler (s = (z−1)/T) for compensator discretization — it degrades phase margin.
- Update duty cycle multiple times per switching period without accounting for the PWM update timing.
- Forget to reset integrator state on mode change (e.g., switching from voltage mode to current limiting).
- Ignore sampling jitter: in the simulator, controller sampling must occur at the same relative position within each switching cycle.

## Output Template

For control loop tasks, provide:

1. Control architecture: voltage mode, current mode, or dual loop.
2. Compensator G_c(s): form, poles, zeros, crossover frequency, PM/GM.
3. Discretization method and resulting G_c(z) coefficients.
4. Difference equation implementation with state variable update order.
5. Computational delay model and its impact on stability margin.
6. Anti-windup scheme and integrator limit values.
7. Validation results: simulated step response vs. expected behavior.

## Primary References

- Franklin, Powell & Emami-Naeini — *Feedback Control of Dynamic Systems* (7th ed.)
- Ogata — *Discrete-Time Control Systems*
- Maksimovic & Zane — *Small-Signal Discrete-Domain Modeling of Digitally Controlled PWM Converters* (IEEE TPEL 2007)
- Texas Instruments — *Digital Power Design Seminar*
