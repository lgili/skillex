# Model Review and Audit Guide

> Reference for: semiconductor-models
> Load when: Starting a model audit, planning improvements, or defining validation test cases

## Step 1 — Read the Existing Model

Before proposing any change, fully understand what's already there.

**Questions to answer:**

1. What phenomena does this model capture? (list explicitly: conduction, switching losses, Coss, temperature, reverse recovery, etc.)
2. Where do the parameter values come from? Are they hardcoded, loaded from file, or computed from datasheet formulas?
3. How does the model interact with the MNA solver? (which stamp rows/cols, when is it re-stamped)
4. Is the model linearized for Newton-Raphson? If yes, is the Jacobian correct?
5. What test cases (if any) exist that exercise this model?

---

## Step 2 — Compare to Datasheet

Pick one specific device (e.g., STMicro STW45NM60, Infineon IPW65R045C7) and compare:

| Model Parameter | Code Value | Datasheet Value | Match? |
|---|---|---|---|
| Rds_on (25°C, rated I) | | | |
| V_th (gate threshold) | | | |
| Q_g (total gate charge) | | | |
| Q_gd (Miller charge) | | | |
| C_oss (at V_bus/2) | | | |
| t_rr (body diode) | | | |
| Q_rr (body diode) | | | |
| E_on (at I_test, V_test) | | | |
| E_off (at I_test, V_test) | | | |

**Discrepancy threshold:** >20% difference warrants investigation. >50% is a model defect.

---

## Step 3 — Identify Missing Phenomena

Rate each phenomenon by impact on simulation accuracy:

| Phenomenon | Impact | Modeled? | Priority to add |
|---|---|---|---|
| Conduction voltage (Rds_on / V_CE_sat) | High | | |
| Temperature dependence of Rds_on | Medium–High | | |
| C_oss nonlinearity | High for ZVS converters | | |
| Gate charge / switching time | High for switching loss | | |
| Reverse recovery (Q_rr) | High for hard-switched | | |
| Minority carrier tail (IGBT) | Medium | | |
| Body diode forward drop | High for synchronous | | |
| Thermal model (R_th junction-to-case) | Medium for thermal | | |

**Priority rule:** Fix "High impact, not modeled" first. Skip "Low impact" to preserve simulation speed.

---

## Step 4 — Propose Improvements

For each gap, document:

```
Gap: [phenomenon not modeled]
Current behavior: [what happens in simulation without it]
Proposed fix: [specific equation or algorithm change]
Parameters needed: [what to add to config/datasheet lookup]
Expected accuracy improvement: [percentage or qualitative]
Simulation speed impact: [negligible / +5% / +20%]
```

Example:
```
Gap: C_oss nonlinearity
Current behavior: C_oss assumed constant → ZVS timing error ~30% at light load
Proposed fix: C_oss(V) = C_oss_1V / sqrt(V_DS), integrate for E_oss
Parameters needed: C_oss_1V (from datasheet curve at 1 V), or fit from 2-point datasheet data
Expected accuracy improvement: ZVS condition prediction within 10%
Speed impact: negligible (one extra sqrt call per time step)
```

---

## Step 5 — Define Validation Test Cases

Each model change must have at least one reproducible validation:

### Test Case Template

```
Test: [name]
Circuit: [simple schematic description]
Conditions: V_bus = X V, I_D = Y A, R_gate = Z Ω, T_j = W °C
Expected output (from datasheet or reference SPICE):
  - E_on = [value] µJ ± 20%
  - E_off = [value] µJ ± 20%
  - t_r = [value] ns ± 30%
Pass criterion: simulation value within tolerance of expected
```

### Standard Test Circuits

**Switch commutation test:**
```
V_bus ─── D_freewheel ─── L_load
              │
           MOSFET/IGBT
              │
            GND

Steps:
1. Precharge L_load to I_test
2. Turn on MOSFET
3. Measure turn-on energy from v_DS · i_D waveform
4. Turn off MOSFET
5. Measure turn-off energy
6. Compare to datasheet E_on, E_off at same conditions
```

**Reverse recovery test:**
```
V_bus ─── D_test ─── L ─── V_source (forward bias D_test to I_F)
Step:
1. Ramp V_source negative at controlled dI/dt
2. Measure I_rr, t_rr, Q_rr from i_D waveform
3. Compare to datasheet Q_rr at same I_F and dI/dt
```

---

## Step 6 — Review Checklist

Before closing a model review:

- [ ] All parameters traced to datasheet with page/figure reference
- [ ] Conduction model correct (Rds_on or V_CE_sat)
- [ ] Temperature dependence included
- [ ] Switching losses validated against datasheet energy curves
- [ ] Body diode reverse recovery modeled for hard-switched designs
- [ ] C_oss included if the converter uses soft switching (ZVS/ZCS)
- [ ] MNA stamp correct (symmetric conductance, right history current)
- [ ] No hardcoded magic numbers in model implementation
- [ ] Validation test passes with actual expected values (not just "runs without crashing")
- [ ] Review documented: what was changed, why, and which device it was validated against

---

## Common Model Bugs

| Bug | Symptom | Fix |
|---|---|---|
| Wrong Rds_on sign or placement in stamp | Current flows backward through switch | Check stamp polarity (drain=p, source=q convention) |
| Body diode not decoupled from main switch | Diode conducts when switch should block | Separate body diode as independent element |
| C_oss not discharged before ZVS event | ZVS margin incorrectly reported as present | Integrate C_oss energy from V_bus to 0 correctly |
| Q_rr not dependent on dI/dt | Over/underestimated reverse recovery | Scale I_rr as sqrt(Q_rr · dI/dt) |
| Temperature model applied to wrong quantity | Losses don't scale with operating temperature | Rds_on increases with T, V_th decreases — separate coefficients |
| Switching loss double-counted | Efficiency too low | Count E_on only at turn-on, E_off only at turn-off events |
