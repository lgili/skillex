# Test Case Design

> Reference for: simulation-verification
> Load when: Designing benchmark circuits from simple elements to full converters

## Benchmark Hierarchy

### Level 1 — Single-Element Unit Tests

These test individual component models and the numerical integrator independently.

---

**Test 1.1: RC Step Response**
```
Circuit: V_s(1V step) → R(1kΩ) → C(1µF) → GND
Expected: v_C(t) = 1 - exp(-t/τ), τ = RC = 1ms
Metrics: max |v_C_sim - v_C_analytic| / V_s < 0.01%  (at any time point)
Duration: 5τ = 5ms
```

**Test 1.2: RL Step Response**
```
Circuit: V_s(1V step) → R(10Ω) → L(1mH) → GND
Expected: i_L(t) = (V_s/R)·(1 - exp(-t·R/L)), τ = L/R = 100µs
Metrics: max |i_L_sim - i_L_analytic| / I_ss < 0.01%
Duration: 5τ = 500µs
```

**Test 1.3: RLC Resonance (LC Tank)**
```
Circuit: V_s = 0, initial: i_L(0)=1A, v_C(0)=0
L=1mH, C=1µF, R=0.1Ω (lightly damped)
Expected: i_L(t) = I0·exp(-αt)·cos(ω_d·t + φ)
ω_0 = 1/sqrt(LC) = 31.62 krad/s, α = R/(2L) = 50 rad/s, ω_d = sqrt(ω_0² - α²)
Metrics: frequency error < 0.1%, amplitude envelope error < 0.5% at t = 5/α
```

**Test 1.4: Ideal Diode Forward/Reverse**
```
Circuit: V_s (sinusoidal 10V pk, 1kHz) → D (ideal) → R(1kΩ) → GND
Expected: v_out = max(V_s, 0)  (half-wave rectifier)
Metrics: RMS error < 0.1%, no current when V_s < 0
```

---

### Level 2 — Single Converter Operating Points

**Test 2.1: Buck Converter, CCM**
```
V_in=48V, V_out=12V, D=0.25, L=100µH, C=100µF, R=1.2Ω (I_out=10A), f_sw=100kHz
Expected (analytical):
  V_out = D·V_in = 12V  (±0.1%)
  ΔI_L  = (V_in-V_out)·D/(L·f_sw) = 90mA  (measured peak-to-peak, ±5%)
  ΔV_out = ΔI_L/(8·C·f_sw) = 0.01125V  (±10%)
  η_conduction ≈ 100% (no losses in ideal model)

Run to steady state (confirm with cycle detector), then measure:
  - V_out_avg, ΔI_L, ΔV_out, i_L_avg
Pass: each metric within stated tolerance of analytical value
```

**Test 2.2: Buck Converter, DCM**
```
Same as 2.1 but R=24Ω (I_out=0.5A, below CCM boundary)
D_crit = 1-sqrt(2L·f_sw/R) = 1-sqrt(0.08/24) = ...  (compute)
Expected: V_out = M(D,K)·V_in  using DCM formula
  K = 2L·f_sw/R = 0.0083, D_crit ≈ 0.264
  Since D=0.25 < D_crit → DCM confirmed
  V_out ≈ 2·V_in / (1 + sqrt(1 + 4K/D²))  ≈ 10.7V  (vs 12V in CCM)
```

**Test 2.3: Boost Converter, CCM**
```
V_in=12V, V_out=48V, D=0.75, L=200µH, C=220µF, R=23Ω, f_sw=100kHz
Expected: V_out = V_in/(1-D) = 48V, I_L_avg = I_out/(1-D) = 8.35A
```

**Test 2.4: Flyback Converter**
```
V_in=100V, V_out=12V, n=5:1, D=0.37, L_m=500µH, C_out=470µF, P=60W
Expected: V_out = n·V_in·D/(1-D) [CCM] = 5·100·0.37/0.63 ≈ ... (adjust D)
Check: no saturation (B_pk = L_m·I_pk/(N·A_c) < B_sat)
```

---

### Level 3 — Transient / Dynamic Tests

**Test 3.1: Buck Load Step Response**
```
Setup: Test 2.1 at steady state
Event: Load R steps from 1.2Ω to 2.4Ω (10A → 5A) at t=5ms
Expected behavior:
  - V_out overshoots (voltage mode control)
  - Overshoot < 10% of V_out (with properly designed type-II compensator)
  - Settling time < 10·(1/f_c) = ... ms
  - Final V_out returns to 12V ± 0.5%
Metrics: overshoot%, settling time, steady-state error
```

**Test 3.2: Startup with Soft-Start**
```
V_in = 48V, initial: all voltages/currents = 0
Soft-start: ramp V_ref from 0 to 12V over 5ms
Expected: i_L never exceeds 1.5·I_rated (inrush limit), V_out tracks reference
Metrics: max(i_L), V_out tracking error during ramp
```

---

### Level 4 — Edge Cases and Stress

**Test 4.1: CCM/DCM Boundary Crossing**
```
Same as Test 2.1, sweep load R from 0.5Ω to 50Ω
Monitor: operating mode (CCM/DCM), V_out vs. expected M(D,K)
Expected: smooth transition at D_crit, no numerical instability
Metrics: V_out error < 2% across full range, no divergence
```

**Test 4.2: Transformer Near Saturation**
```
Flyback: increase I_pk until B_pk = 0.9·B_sat
Expected: inductance reduces, current rises faster, simulator detects onset
Metrics: B_pk reported correctly, simulation does not diverge at saturation
```

**Test 4.3: Very Stiff Circuit**
```
Buck with C=100µF and R=0.001Ω (nearly short circuit load)
Time constants: fast = RC = 100ns, slow = L/R = 100ms (ratio 1e6)
Expected: simulator converges with acceptable accuracy at fixed h = 1ns
Metrics: convergence within 10 NR iterations per step, no divergence
```
