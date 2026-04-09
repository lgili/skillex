# Diode Models

> Reference for: semiconductor-models
> Load when: Reviewing diode forward voltage, junction capacitance, or reverse recovery model

## Diode Regions

| Region | Condition | Behavior |
|---|---|---|
| Forward bias | V_D > V_th (~0.5–1.5 V) | Conducts with forward drop V_f |
| Reverse bias | V_D < 0 | Blocks (small leakage I_s) |
| Reverse recovery | After forward conduction, V_D goes negative | Current reversal until minority carriers recombined |
| Avalanche | V_D < −V_BR | Breakdown — model only if protection circuits are simulated |

---

## Piecewise-Linear (Ideal + Resistor) Model

Simplest model adequate for most power converter simulations:

```
Forward:   V_D = V_f + R_f · I_D       (threshold + dynamic resistance)
Reverse:   I_D = 0   (ideal blocking)

Parameters:
  V_f   = 0.7–1.5 V  (Si), 0.3–0.5 V (SiC Schottky)
  R_f   = 10–100 mΩ  (bulk resistance from datasheet I_F vs V_F curve)

MNA stamp (forward conducting):
  Conductance G_f = 1/R_f  between anode (a) and cathode (k)
  Current source I_f = V_f / R_f  (offset for threshold)

  Y(a,a) += G_f;  Y(a,k) -= G_f;
  Y(k,a) -= G_f;  Y(k,k) += G_f;
  J(a)   -= I_f;  J(k)   += I_f;

State determination (each time step):
  if V_ak > 0:   forward — apply stamp above
  else:          reverse — remove stamp (open circuit)
```

**Note on state switching:** Diode state change (forward↔reverse) during Newton-Raphson requires re-evaluation after convergence — run extra NR pass if state changed at convergence.

---

## Exponential Diode Model (Shockley)

More accurate for low-current conduction and thermal calculations:

```
I_D = I_s · (exp(V_D / (n · V_T)) − 1)

I_s  = reverse saturation current (1 pA – 1 µA)
n    = ideality factor (1–2)
V_T  = k·T/q ≈ 25.85 mV at 300 K (thermal voltage)

Temperature dependence of I_s:
  I_s(T) = I_s_T0 · (T/T0)^3 · exp(E_g/k · (1/T0 − 1/T))
  E_g ≈ 1.12 eV (silicon)

Newton-Raphson linearization (required for MNA):
  dI_D/dV_D = I_s/(n·V_T) · exp(V_D/(n·V_T)) = (I_D + I_s) / (n·V_T)

  Linearized stamp around operating point V_D0:
    G_eq = dI_D/dV_D at V_D0
    I_eq = I_D(V_D0) − G_eq · V_D0
```

```cpp
struct DiodeExponential {
    double I_s, n, V_T;

    double current(double v_d) const {
        return I_s * (std::exp(v_d / (n * V_T)) - 1.0);
    }
    double conductance(double v_d) const {
        return (current(v_d) + I_s) / (n * V_T);
    }
    void stamp(MNAMatrix& Y, MNAVector& J, int a, int k, double v_d_prev) const {
        double G_eq = conductance(v_d_prev);
        double I_eq = current(v_d_prev) - G_eq * v_d_prev;
        Y(a,a) += G_eq; Y(a,k) -= G_eq;
        Y(k,a) -= G_eq; Y(k,k) += G_eq;
        J(a)   -= I_eq; J(k)   += I_eq;
    }
};
```

---

## Reverse Recovery Model

Reverse recovery is critical for hard-switched bridge legs (diode Q_rr causes cross-conduction with the complementary switch).

**Key parameters from datasheet:**
```
I_F   = forward current before turn-off
-dI/dt = current slew rate during turn-off (A/µs)
t_rr  = total reverse recovery time
I_rr  = peak reverse recovery current
Q_rr  = reverse recovery charge = ½ · I_rr · t_rr

t_rr  ≈ sqrt(2 · Q_rr / (-dI/dt))   [if only Q_rr and dI/dt given]
I_rr  ≈ sqrt(2 · Q_rr · (-dI/dt))
```

**Simplified reverse recovery model for time-domain simulation:**
```
Phase 1 (0 < t < t_a): current still falling at forced dI/dt rate
  i_D(t) = I_F − (-dI/dt) · t

Phase 2 (t_a < t < t_rr): current recovers from I_rr back toward 0
  i_D(t) = -I_rr · exp(−(t−t_a) / t_b)    [exponential recovery]
  t_b = t_rr − t_a,  typically t_a ≈ 0.3·t_rr, t_b ≈ 0.7·t_rr

Charge recovery check:
  ∫₀^t_rr i_D dt = −Q_rr    [integral of negative current = Q_rr]
```

```cpp
class ReverseRecoveryModel {
    double Q_rr_, t_rr_, I_F_;
    double phase_; // track recovery phase
    double t_rr_start_;

public:
    double current(double t, double t_start, double dI_dt) const {
        double t_rel = t - t_start;
        double I_rr  = std::sqrt(2.0 * Q_rr_ * std::abs(dI_dt));
        double t_a   = I_F_ / std::abs(dI_dt) + I_rr / std::abs(dI_dt);
        if (t_rel < t_a)
            return I_F_ - std::abs(dI_dt) * t_rel;
        double t_b = t_rr_ - t_a;
        return -I_rr * std::exp(-(t_rel - t_a) / t_b);
    }
};
```

**Power loss from reverse recovery:**
```
P_rr = ½ · Q_rr · V_bus · f_sw
```

---

## Schottky Diode Differences

| Property | PN Junction | Schottky |
|---|---|---|
| V_f | 0.7–1.5 V | 0.2–0.5 V (lower threshold) |
| Reverse recovery | Yes (minority carrier storage) | Nearly none (majority carrier only) |
| Leakage current | Low | Higher (increases with T) |
| Max voltage | 100 V – 10 kV | Typically < 200 V (Si), < 2 kV (SiC) |
| Use case | High voltage (IGBT freewheeling) | Low voltage output rectifier, SiC for high V |

For SiC Schottky: Q_rr ≈ 0, so reverse recovery loss is negligible — remove Q_rr stamp from bridge leg model.

---

## Body Diode (MOSFET Internal Diode)

MOSFET body diode is a PN junction between source and drain:

```
V_f_body ≈ 0.7–1.2 V (higher than external Schottky if used)
t_rr_body = 100–500 ns (significant for hard-switched synchronous converters)

In synchronous buck/boost during dead-time:
  → Body diode conducts for the dead-time interval
  → At dead-time end, complementary switch turns on → body diode undergoes reverse recovery
  → Energy lost = ½·Q_rr_body·V_bus + forward drop during dead-time

Model: same as PN diode, parameters from MOSFET datasheet "body diode" section.
```
