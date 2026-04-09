---
name: semiconductor-models
description: Semiconductor device modeling specialist for power electronics simulators. Focused on reviewing existing C++ MOSFET, IGBT, and diode models, proposing improvements, and ensuring correct usage in circuit simulation. Use when auditing device model accuracy, extracting parameters from datasheets, analyzing switching transients, or improving model fidelity for hard-switched or soft-switched converters. Trigger for terms like "MOSFET model", "IGBT model", "diode model", "Rds_on", "body diode", "reverse recovery", "Q_rr", "switching loss", "SPICE model", "device parameters", or "semiconductor simulation".
---

# Semiconductor Models

## Overview

Use this skill to review, improve, and correctly apply existing semiconductor device models (MOSFET, IGBT, diode) in the C++ simulator. The models already exist in the codebase — this skill's job is to:

1. Audit the existing models for accuracy and completeness.
2. Propose improvements where fidelity is insufficient.
3. Ensure models are used correctly in converter simulations (right parameters, right operating region).

Default stance:

- Prefer physics-based models over purely behavioral ones for switching transient accuracy.
- Match model complexity to simulation purpose: loss estimation needs switching waveform fidelity; steady-state analysis needs only conduction model.
- All model parameters must be traceable to datasheet values or measurement data — no guessed constants.
- Validate any changed or added model against known reference (datasheet, SPICE netlist, or measurement).

## Core Workflow

1. **Audit the existing model.**
   - Read the C++ implementation. Identify which device phenomena are modeled: Rds_on, threshold, body diode, C_oss, switching times, temperature dependence.
   - Check parameter sources: are they hardcoded? Loaded from file? Match a real device?
   - Load `references/model-review-guide.md` for a structured audit checklist.

2. **Identify gaps and inaccuracies.**
   - Compare model behavior to datasheet: does Rds_on match? Does switching time (t_r, t_f) align?
   - Check if C_oss nonlinearity is handled (critical for ZVS timing in resonant converters).
   - Check if body diode reverse recovery (Q_rr, t_rr) is modeled (critical for hard-switched bridge legs).

3. **Propose and implement improvements.**
   - Load `references/mosfet-igbt-models.md` for MOSFET/IGBT physics and parameter equations.
   - Load `references/diode-models.md` for diode junction model and reverse recovery.
   - Document each change: what was wrong, what was changed, which datasheet page it references.

4. **Integrate correctly in converter simulations.**
   - Verify the model is stamped correctly in MNA: switch state (ON/OFF) changes which stamps are active.
   - Confirm that output capacitance C_oss contributes to ZVS energy calculation if used in resonant converters.
   - Confirm body diode conduction is properly handled in synchronous converters during dead-time.

5. **Validate the model.**
   - Run a test case (single switch commutation with known V, I, gate drive) and compare waveforms.
   - Compare switching energy E_on + E_off to datasheet at the same conditions (V_bus, I_drain, R_gate).
   - Load `references/model-review-guide.md` for validation methodology.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| MOSFET and IGBT models | `references/mosfet-igbt-models.md` | Reviewing or improving switch model accuracy, analyzing switching waveforms, or extracting C_oss/gate charge parameters |
| Diode models | `references/diode-models.md` | Reviewing diode forward voltage, junction capacitance, or reverse recovery model |
| Model review and audit guide | `references/model-review-guide.md` | Starting an audit of existing models, planning improvement roadmap, or defining validation test cases |

## Constraints

### MUST DO

- Trace every model parameter to a datasheet table, graph, or measurement. Document it.
- Include temperature dependence for at least Rds_on and V_f — these change significantly from 25°C to junction temperature.
- Verify switching loss against datasheet energy curves (E_on, E_off vs. I_D at rated V_bus).
- Validate body diode behavior for any synchronous converter model (dead-time interval is body diode conduction).
- Check if existing models handle discontinuous gate drive (partial turn-on) — relevant for variable gate resistance optimization.

### MUST NOT DO

- Replace working models with more complex ones without demonstrating improved accuracy — complexity has a simulation speed cost.
- Hardcode parameters without making the source traceable.
- Ignore C_oss nonlinearity for soft-switched (ZVS/ZCS) converter models — it dominates ZVS timing at light load.
- Apply an IGBT model to a MOSFET or vice versa — their switching mechanisms differ fundamentally.
- Change model behavior without a before/after comparison against a reference waveform or loss measurement.

## Output Template

For model review and improvement tasks, provide:

1. **Audit summary**: which device, which model exists, list of gaps found.
2. **Proposed changes**: specific parameters to update, equations to correct, new phenomena to add.
3. **Parameter table**: before/after values with datasheet source.
4. **Validation test setup**: what circuit, what conditions, which waveforms to compare.
5. **Expected impact**: where in the converter simulation does this change matter most (loss, ZVS margin, transient response).

## Primary References

- Mohan, Undeland & Robbins — *Power Electronics*, Appendix B (device models)
- Infineon / ON Semi / STMicro application notes on MOSFET and IGBT switching
- Baliga — *Fundamentals of Power Semiconductor Devices*
- JEDEC JESD24 — Standard definitions for switching parameters
