# Small-Signal Models

> Reference for: power-electronics
> Load when: Deriving state-space averaged models, computing transfer functions, or verifying loop gain in simulation

## State-Space Averaging — Method

For a converter with two subintervals, state-space averaging combines the interval matrices weighted by duty cycle:

```
Subinterval 1 (duration D·Ts):
  ẋ = A1·x + B1·u

Subinterval 2 (duration (1-D)·Ts):
  ẋ = A2·x + B2·u

Averaged model:
  ẋ = [D·A1 + (1-D)·A2]·x + [D·B1 + (1-D)·B2]·u
   y = [D·C1 + (1-D)·C2]·x + [D·E1 + (1-D)·E2]·u

Notation: x = [i_L, v_C]ᵀ, u = [v_g, d]ᵀ
```

**Small-signal perturbation** — substitute x = X + x̂, d = D + d̂, u = U + û:
```
x̂̇ = Ā·x̂ + B̄·û + [(A1-A2)·X + (B1-B2)·U]·d̂
ŷ  = C̄·x̂ + Ē·û + [(C1-C2)·X + (E1-E2)·U]·d̂

Ā = D·A1 + (1-D)·A2   (averaged state matrix)
```

---

## Buck Converter — Transfer Functions

**State variables:** x = [i_L, v_C]ᵀ, output y = v_C, input u = v_g, control d.

```
Averaged state matrix (CCM):
  Ā = [ 0         -1/L  ]
      [ 1/C    -1/(RC)  ]

Input matrix:
  B̄ = [ 1/L   V_in/L ]   (columns for v_g and d respectively)
      [  0       0   ]

Control-to-output G_vd(s):
  G_vd(s) = V_in / (LC) · 1 / (s² + s/(RC) + 1/(LC))

  DC gain:  G_vd(0) = V_in
  Poles:    ω_0 = 1/sqrt(LC),  Q = R·sqrt(C/L)

Line-to-output G_vg(s):
  G_vg(s) = D / (LC) · 1 / (s² + s/(RC) + 1/(LC))

  DC gain:  G_vg(0) = D = V_out/V_in
```

---

## Boost Converter — Transfer Functions (CCM)

```
Control-to-output G_vd(s):
  G_vd(s) = [V_in/(1-D)²] · (1 - s·L/((1-D)²·R)) / (s² + s·(1-D)²/(RC) + (1-D)²/(LC))

  DC gain:  G_vd(0) = V_in / (1-D)² = V_out / (1-D)
  RHP zero: ω_z = (1-D)²·R / L
  Poles:    ω_0 = (1-D)/sqrt(LC)

  ** RHP zero limits achievable crossover bandwidth: f_c < f_z / 5 (rule of thumb)
```

---

## Buck-Boost — Transfer Functions (CCM)

```
G_vd(s) = [-V_out / (D·(1-D))] · (1 - s·D·L/((1-D)²·R)) / (s²/(ω_0²) + s/(Q·ω_0) + 1)

  ω_0 = (1-D) / sqrt(LC)
  RHP zero: ω_z = (1-D)²·R / (D·L)
```

---

## PWM Switch Model (Vorpérian)

Replaces the active switch and diode with a three-terminal controlled source network — avoids re-deriving state equations for each topology.

```
Three terminals:  active (a), common (c), passive (p)
CCM relations:    v_cp = D·v_ap  (voltage conversion)
                  i_a  = D·i_c   (current conversion)

For boost:  (a)=switch-source, (c)=inductor-node, (p)=output
Small-signal stamps directly into MNA matrix.
```

---

## Frequency Response Verification in Simulator

To extract G_vd from the running simulator (injection method):

1. Run converter to steady state.
2. Add small sinusoidal perturbation to duty cycle: d(t) = D + d̂·sin(2π·f·t), d̂ ≈ 0.01.
3. Record steady-state output voltage v_out(t) after transients decay.
4. Compute magnitude: |G_vd(f)| = V̂_out / d̂, phase: ∠G_vd(f) = angle of v_out harmonic vs. d perturbation.
5. Sweep over 10 Hz to f_sw/10 to build Bode plot.

```cpp
// Pseudocode for one frequency point
double f = sweep_freq;
double d_hat = 0.01;
double omega = 2.0 * M_PI * f;

// After steady state, record N periods:
std::complex<double> V_out_dft{0,0};
std::complex<double> D_dft{0,0};
for (int k = 0; k < N_samples; ++k) {
    double t_k = k * h;
    V_out_dft += v_out[k] * std::exp(-1i * omega * t_k);
    D_dft     += d_hat * std::sin(omega * t_k) * std::exp(-1i * omega * t_k);
}
std::complex<double> Gvd = V_out_dft / D_dft;
```

---

## Loop Gain Analysis

For a voltage-mode controlled buck with type-II compensator:

```
Open-loop gain:   T(s) = G_vd(s) · H_m · G_c(s) · H_v(s)
  G_c(s) = compensator transfer function
  H_m    = PWM modulator gain = 1/V̂_tri
  H_v    = output voltage divider (feedback network)

Stability margins:
  Phase margin: PM = 180° + ∠T(j·ω_c)   at |T(j·ω_c)| = 0 dB
  Gain margin:  GM = −20·log|T(j·ω_180°)| dB  at ∠T = -180°

Targets:
  PM > 45° (robust: > 60°)
  GM > 6 dB (robust: > 10 dB)
  Crossover frequency f_c < f_sw/5
```

---

## Type-II Compensator

Adds one pole at origin (for zero DC error) + one zero-pole pair for phase boost:

```
G_c(s) = K_c · (1 + s/ω_z1) / (s · (1 + s/ω_p1))

Design steps:
1. f_c = target crossover (< f_sw/5)
2. Place zero ω_z1 at half the LC resonance: f_z1 ≈ f_0/(2·Q)  (or at f_c/2)
3. Place pole ω_p1 at half the switching frequency: f_p1 = f_sw/2
4. Set K_c so |T(jω_c)| = 1:  K_c = ω_c / (|G_vd(jω_c)| · H_m · H_v)
```

## Type-III Compensator

Two zeros + two poles for converters with LC resonance needing extra phase boost:

```
G_c(s) = K_c · (1 + s/ω_z1)·(1 + s/ω_z2) / (s · (1 + s/ω_p1)·(1 + s/ω_p2))

Typical placement:
  ω_z1 = ω_z2 = ω_0 / sqrt(Q)   (at resonance)
  ω_p1 = ω_z1 · Q               (above resonance)
  ω_p2 = f_sw / 2               (anti-alias)
```
