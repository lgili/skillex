# Transformer Models

> Reference for: magnetic-components
> Load when: Building equivalent circuits, extracting datasheet parameters, or deriving referred values for C++ simulator stamps

## Ideal Transformer

```
Primary: N_p turns, voltage v_p
Secondary: N_s turns, voltage v_s, referred load

Turns ratio:  n = N_p / N_s
Relations:    v_p / v_s = n,   i_s / i_p = n
Referred sec: Z_s' = n²·Z_s,  v_s' = n·v_s,  i_s' = i_s/n
```

**Never use this alone in a simulator** — leakage inductance creates the ZVS timing in LLC, the voltage spike in flyback, and the cross-regulation behavior in multi-output designs.

---

## T-Equivalent Circuit (Two-Winding Non-Ideal)

```
Primary terminal ─── R_p ─── L_lk_p ──┬── Ideal xfmr (1:1) ─── L_lk_s' ─── R_s' ─── Secondary terminal
                                        │
                                       R_c ║ L_m    (core loss || magnetizing)
                                        │
                                       GND
```

| Parameter | Symbol | Typical extraction |
|---|---|---|
| Primary winding resistance | R_p | DC resistance measurement |
| Secondary winding resistance (referred) | R_s' = n²·R_s | DC resistance measurement |
| Primary leakage inductance | L_lk_p | Short-circuit test, primary side |
| Secondary leakage inductance (referred) | L_lk_s' = n²·L_lk_s | Short-circuit test, secondary side |
| Magnetizing inductance | L_m | Open-circuit test, primary |
| Core loss resistance | R_c | Open-circuit test, power measurement |

**Total leakage inductance (referred to primary):**
```
L_lk_total = L_lk_p + L_lk_s'   (series combination)
```

---

## Parameter Extraction from Datasheet / Measurements

### Open-Circuit Test (Secondary Open)

Apply rated voltage V_p at primary, measure I_oc, P_oc.

```
Z_oc = V_p / I_oc
R_c  = V_p² / P_oc
X_m  = V_p / sqrt(I_oc² − (P_oc/V_p)²)
L_m  = X_m / (2π·f_test)
```

### Short-Circuit Test (Secondary Shorted)

Apply reduced voltage V_sc at primary until rated current flows; measure P_sc.

```
Z_sc  = V_sc / I_sc
R_sc  = P_sc / I_sc²     ≈ R_p + R_s'
X_sc  = sqrt(Z_sc² − R_sc²)
L_lk  = X_sc / (2π·f_test)  ≈ L_lk_p + L_lk_s'
```

**Split assumption (equal leakage):**
```
L_lk_p = L_lk_s' = L_lk_total / 2
```
For precision (e.g., LLC design), measure leakage from each side separately with the other shorted.

---

## Referred-Value Quick Reference

All secondary quantities referred to primary (multiply by n²):

```
R_s'   = n² · R_s
L_lk_s'= n² · L_lk_s
C_s'   = C_s / n²        (capacitance refers by dividing by n²)
V_s'   = n  · V_s
I_s'   = I_s / n
Z_s'   = n² · Z_s
```

---

## LLC Resonant Tank — Transformer Parameters

For LLC, the magnetizing inductance L_m and resonant inductance L_r are the primary model parameters:

```
L_r = leakage inductance (series resonant)
L_m = magnetizing inductance (parallel resonant element, does NOT transfer energy to secondary directly)

If L_m >> L_r:
  f_r = 1/(2π·sqrt(L_r·C_r))        (series resonance, gain = 1)
  f_m = 1/(2π·sqrt((L_r+L_m)·C_r))  (parallel resonance, maximum gain)

Voltage gain limited at no load by L_m/(L_r+L_m).
```

---

## Flyback Transformer

Flyback is a coupled-inductor topology — energy stored in L_m during primary on-time, released during off-time.

```
L_m = V_in · D · T_s / ΔI_m       (primary magnetizing inductance)
Peak flux density:
  B_pk = L_m · I_pk / (N_p · A_c)  [must be < B_sat]

Reset condition (CCM):
  V_R = V_in · D / (1 − D)         (flyback voltage across secondary switch / rectifier)
  n must satisfy: V_R ≤ V_out + V_diode_fwd
```

**Leakage spike:** At primary switch turn-off, leakage inductance L_lk_p causes a voltage spike:
```
V_spike ≈ I_pk · sqrt(L_lk_p / C_oss)    (undamped oscillation)
```
Model this with the series leakage stamp; add clamp circuit (RCD or active clamp) as separate component.

---

## Multi-Winding Transformer

For N windings, the inductance matrix L is N×N:

```
L = [L_11  M_12  M_13 ...]
    [M_21  L_22  M_23 ...]
    [M_31  M_32  L_33 ...]
    [  ...                ]

M_ij = k_ij · sqrt(L_ii · L_jj)   (k_ij = coupling coefficient ≤ 1)

For tightly coupled ideal transformer:  k_ij → 1
For gapped core (e.g., flyback):        k < 1 → leakage
```

**Voltage equations:**
```
v_i = sum_j (L_ij · di_j/dt) + R_i · i_i
```

This is the general stamp used in the simulator — see `coupled-inductor-stamps.md` for MNA implementation.
