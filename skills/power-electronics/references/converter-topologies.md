# Converter Topologies

> Reference for: power-electronics
> Load when: Implementing or reviewing specific converter models in the C++ simulator

## Non-Isolated DC/DC Converters

### Buck (Step-Down)

**Circuit:** S1 (high-side switch), D1 (or S2 for synchronous), L, C_out, R_load.

**CCM steady-state:**
```
V_out = D · V_in
I_L_avg = I_out = V_out / R
ΔI_L = (V_in - V_out) · D · T_s / L
ΔV_out = ΔI_L / (8 · C · f_sw)   [approximate]
```

**Subinterval states (CCM):**
- Subinterval 1 (0 ≤ t < D·Ts): S1 ON, D1 OFF → v_L = V_in − V_out
- Subinterval 2 (D·Ts ≤ t < Ts): S1 OFF, D1 ON → v_L = −V_out

**Simulator stamp note:** Switch each subinterval by toggling the ideal switch stamps at t = D·Ts; in discrete-time step the solver advances within each subinterval until the switching instant.

---

### Boost (Step-Up)

**Circuit:** L, S1 (low-side switch), D1, C_out, R_load.

**CCM steady-state:**
```
V_out = V_in / (1 − D)
M(D) = 1 / (1 − D)
ΔI_L = V_in · D · T_s / L
```

**Subinterval states (CCM):**
- Subinterval 1: S1 ON → v_L = V_in
- Subinterval 2: S1 OFF, D1 ON → v_L = V_in − V_out

**Right-half-plane zero:** G_vd has an RHP zero at ω_RHP = (1−D)²·R / L — limits closed-loop bandwidth.

---

### Buck-Boost (Inverting)

**CCM steady-state:**
```
V_out = −V_in · D / (1 − D)    [output polarity inverted]
M(D) = −D / (1 − D)
```

**Key difference from buck/boost:** Output voltage polarity is inverted — inductor connected between switch and diode, no direct path from input to output.

**RHP zero:** ω_RHP = (1−D)²·R / (D·L) — present in control-to-output transfer function.

---

## Isolated DC/DC Converters

### Flyback

**Equivalent circuit:** Buck-boost with transformer (turns ratio n = N_s/N_p).

**CCM steady-state:**
```
V_out = V_in · D · n / (1 − D)
Magnetizing inductor L_m referred to primary absorbs energy during subinterval 1.
```

**Critical parameters:**
- Magnetizing inductance L_m (primary referred)
- Leakage inductance L_lk — causes voltage spike at switch turn-off; must model clamp circuit
- Turns ratio n = N_s / N_p

**Simulator stamp:** Model as coupled inductors (L_m + L_lk) with ideal transformer stamp; see `magnetic-components` skill for non-ideal transformer stamps.

**DCM boundary:**
```
D_crit = 1 / sqrt(1 + 2·L_m·f_sw / (n²·R·D²))
```

---

### Full-Bridge (Phase-Shifted)

**Circuit:** 4 MOSFETs (Q1–Q4) in H-bridge, high-frequency transformer, output rectifier (diodes or synchronous), L_f, C_f.

**Operating principle:**
- Primary voltage V_AB alternates ±V_in during active phase, zero during freewheeling phase
- Phase-shift angle φ controls effective duty cycle: D_eff = φ / π
- ZVS achieved when inductor energy ≥ MOSFET output capacitor energy: ½·L·I_sw² ≥ ½·C_oss·V_in²

**CCM steady-state:**
```
V_out = n · V_in · D_eff
D_eff = 1 − φ/π    (for phase-shift control)
```

**Simulator note:** Four switch states must be modeled — positive active, freewheeling+, negative active, freewheeling−. Dead-time intervals create ZVS transitions.

---

### LLC Resonant Converter

**Circuit:** Half-bridge or full-bridge switches, resonant tank (L_r, C_r, L_m), transformer, output rectifier.

**Key parameters:**
```
f_r = 1 / (2π · sqrt(L_r · C_r))      [series resonance]
f_m = 1 / (2π · sqrt((L_r + L_m) · C_r))  [parallel resonance]
Q = sqrt(L_r/C_r) / R_ac              [quality factor, R_ac = 8n²R/π²]
λ = L_m / L_r                          [inductance ratio]
```

**Voltage gain (FHA approximation):**
```
M(f_n, Q) = f_n² / sqrt((f_n² - 1 + f_n²/λ)² + Q²·f_n²·(f_n² - 1)²)
f_n = f_sw / f_r
```

**Simulator note:** LLC requires time-domain simulation (FHA is only valid at resonance). Model resonant tank as series RLC; switch states at natural zero crossings of resonant current. Load-independent ZVS occurs above resonance.

---

### Dual Active Bridge (DAB)

**Circuit:** Two full-bridges connected via high-frequency transformer and series inductance L.

**Single-phase-shift (SPS) control:**
```
P = (V_in · V_out · φ) / (n · ω · L) · (1 − |φ|/π)
where φ = phase shift, ω = 2π·f_sw
```

**Operating constraint:** ZVS condition depends on φ, load current, and L — verify analytically and in simulation.

---

## DC/AC Converters (Inverters)

### Single-Phase Full-Bridge Inverter

**SPWM modulation index:** m_a = V̂_ref / V̂_tri (0 ≤ m_a ≤ 1 for linear modulation)
```
V_out_fund = m_a · V_dc / 2   (half-bridge)
V_out_fund = m_a · V_dc       (full-bridge)
```

**Harmonic spectrum:** Dominant harmonics at f_sw ± 2f_0, 2f_sw ± f_0, etc.

**Simulator note:** Modulation comparison happens at each time step; switch toggling occurs when triangular carrier crosses reference. With discrete-time step h, switching instant must be interpolated or the carrier comparison re-evaluated within the step.

---

### Three-Phase Two-Level Inverter

**Space vector notation:** V_s = (2/3)(V_a + a·V_b + a²·V_c), a = e^(j2π/3)

**SVPWM:** 8 voltage vectors (V0–V7), active vectors V1–V6, zero vectors V0, V7.
```
T_1 = T_s · m_a · sqrt(3)/2 · sin(π/3 − θ_s)
T_2 = T_s · m_a · sqrt(3)/2 · sin(θ_s)
T_0 = T_s − T_1 − T_2
```

**Switching frequency constraint in simulator:** Minimum time step h ≤ T_s / (2 · oversampling_ratio) to correctly resolve SVPWM events.
