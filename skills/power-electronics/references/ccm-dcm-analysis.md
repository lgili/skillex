# CCM / DCM Analysis

> Reference for: power-electronics
> Load when: Analyzing operating mode boundaries, DCM waveforms, or DCM transfer functions

## CCM vs. DCM — Definitions

| Parameter | CCM | DCM |
|---|---|---|
| Inductor current | Never reaches zero | Reaches zero before next switching period |
| Output impedance | Low (capacitive dominant) | Higher (depends on load) |
| Small-signal model | 2nd order (L-C resonance visible) | Effectively 1st order (L dynamics fast) |
| Transient response | Slower crossover | Faster, but higher output impedance |
| Conduction losses | Lower average I_L | Lower peak I_L |

---

## Boundary Condition (CCM↔DCM)

For any converter, DCM begins when the inductor current ripple ΔI_L equals twice the average inductor current:

```
ΔI_L = 2 · I_L_avg    →   boundary condition

For buck:
  K_crit = 1 − D         where K = 2L/(R·Ts)
  CCM when K > K_crit    →   L > (1−D)·R·Ts/2

For boost:
  K_crit = D·(1−D)²
  CCM when K > K_crit    →   L > D·(1−D)²·R·Ts/2

For buck-boost:
  K_crit = (1−D)²
  CCM when K > K_crit    →   L > (1−D)²·R·Ts/2
```

**Critical inductance** (lightest load that still gives CCM at operating D):
```
L_crit = (1−D)·R·Ts/2      [buck]
L_crit = D·(1−D)²·R·Ts/2   [boost]
```

---

## DCM Subintervals

DCM introduces a **third subinterval** where both switches are OFF and inductor current is zero.

```
Buck DCM subintervals:
  d1 = D               (S on: i_L ramps up)
  d2 = ΔI_L / (V_out/L·Ts)  (D on: i_L ramps down to zero)
  d3 = 1 − d1 − d2    (dead: both off, i_L = 0)

Peak inductor current:
  i_pk = V_in·D·Ts / L    (same as CCM)

Average inductor current (= output current in buck):
  I_out = i_pk · d2 / 2 = (V_in·D·Ts / L) · d2 / 2
```

---

## DCM Voltage Conversion Ratio

**Buck DCM:**
```
M(D, K) = 2 / (1 + sqrt(1 + 4K/D²))
K = 2L / (R·Ts)

At light load (large R, small K): M → 1  (output rises toward V_in)
```

**Boost DCM:**
```
M(D, K) = (1 + sqrt(1 + 4D²/K)) / 2
K = 2L / (R·Ts)
```

**Buck-Boost DCM:**
```
M(D, K) = −D / sqrt(K)    (magnitude)
K = 2L / (R·Ts)
```

---

## DCM Small-Signal Model (Buck Example)

In DCM, the inductor dynamics are much faster than the output filter capacitor. The effective small-signal model reduces to a **1st-order system**:

```
Control-to-output transfer function (DCM buck):
  G_vd(s) = V_out/D · 1 / (1 + s·R·C)

One pole at:   ω_p = 1 / (R·C)
No RHP zero (unlike boost DCM)
Low-frequency gain:   G_vd(0) = V_out / D  (higher than CCM gain)
```

**Boost DCM** adds an RHP zero that is now load-dependent:
```
ω_RHP = 2·V_out² / (D·I_out·L)    [approximately]
```

---

## Detecting Operating Mode in the Simulator

At each switching cycle in the simulation, check inductor current at subinterval 2 end:

```cpp
// After propagating subinterval 2 (freewheeling):
if (i_L < 0.0) {
    // Simulator approached zero — clamp and enter DCM subinterval 3
    i_L = 0.0;
    t_d3_start = current_time;
    mode = OperatingMode::DCM;
} else {
    mode = OperatingMode::CCM;
}
```

**Important:** In discrete-time simulation, the zero crossing may not coincide with a time step. Use linear interpolation or event detection to find the exact instant, then restart integration from that point.

---

## DCM Steady-State Solver

Given V_in, V_out, D, L, Ts, R — verify and compute d2 iteratively:

```
// Buck DCM: volt-second balance across subintervals
// (V_in - V_out)·d1 + (-V_out)·d2 = 0
// => d2 = (V_in - V_out)·d1 / V_out = d1·(M⁻¹ - 1)

d2 = D * (V_in / V_out - 1.0);
d3 = 1.0 - D - d2;
if (d3 < 0) {
    // d3 < 0 means CCM — back-calculate correct inductor current ripple
    mode = CCM;
}
```

---

## Mode Transition Effects on the Simulator

| Event | Effect in simulator |
|---|---|
| CCM→DCM at lower load | Subinterval 3 appears; zero-crossing detection required |
| DCM→CCM at higher load | Third subinterval disappears; inductor never hits zero |
| Near boundary (critical) | Oscillates between modes — add hysteresis band in mode detector |
| Forced DCM (synchronous converter) | Body diode conducts when sync switch blocks; model separately |

---

## Loss Estimation

**Conduction losses:**
```
P_cond_switch = I_rms² · Rds_on
P_cond_diode  = I_avg · V_f + I_rms² · R_d    (V_f = forward voltage drop)
P_cond_L      = I_rms² · DCR
```

**Switching losses (hard-switched):**
```
P_sw = (E_on + E_off) · f_sw    (from datasheet at given I and V)
P_Qrr = ½ · Q_rr · V_bus · f_sw   (diode reverse recovery)
```

**Core losses:** Use Steinmetz equation — see `magnetic-components` skill.

**Efficiency estimate:**
```
η = P_out / (P_out + P_cond + P_sw + P_core + P_gate)
P_gate = Q_g · V_gs_drive · f_sw
```
