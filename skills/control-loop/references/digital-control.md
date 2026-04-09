# Digital Control and Discretization

> Reference for: control-loop
> Load when: Z-domain design, ZOH/Tustin discretization formulas, or difference equation implementation

## Discretization Methods

| Method | s → z mapping | Accuracy near f_c | Phase preservation | Typical use |
|---|---|---|---|---|
| ZOH (Zero-Order Hold) | exact for step input | Good | Poor above f_sw/10 | Plant discretization |
| Tustin (bilinear) | s = 2/T·(z−1)/(z+1) | Good if prewarped | Best near prewarped freq | Compensator discretization |
| Forward Euler | s = (z−1)/T | Poor | Adds phase lag | Avoid for control |
| Backward Euler | s = (z−1)/(Tz) | Moderate | Adds phase lead | Rarely used |
| Matched pole-zero | Map poles/zeros directly | Good | Moderate | When poles/zeros known |

---

## Tustin (Bilinear) Discretization

Continuous-to-discrete mapping:
```
s = (2/T_s) · (z − 1) / (z + 1)     [basic Tustin]

With frequency prewarping at ω_c:
s = ω_c / tan(ω_c·T_s/2) · (z − 1) / (z + 1)

Prewarped gain: K = ω_c / tan(ω_c·T_s/2)
```

**Effect of prewarping:** Without prewarping, frequencies in the discrete domain are "compressed" — the compensator zero/pole locations shift. Prewarping at ω_c ensures the crossover frequency matches exactly.

**Type-II compensator (continuous):**
```
G_c(s) = K · (1 + s/ω_z) / (s · (1 + s/ω_p))
```

**After Tustin substitution** (expand and collect z terms):
```
G_c(z) = [b0 + b1·z⁻¹ + b2·z⁻²] / [1 + a1·z⁻¹ + a2·z⁻²]

Coefficients (derived by substituting s = K·(z-1)/(z+1)):
Let α = K = ω_c/tan(ω_c·T_s/2)

b0 = K·(1 + α/ω_z) / (1 + α/ω_p)
b1 = K·(2 + ... )  [expand algebra]
...
```

Use a computer algebra system or the formula below for exact coefficients.

---

## Z-Transform of Common Transfer Functions

| Continuous G(s) | Discrete G(z) [ZOH] |
|---|---|
| 1/s (integrator) | T_s·z / (z−1) |
| 1/(s+a) | (1−e^{-aT}) / (z − e^{-aT}) |
| ω²/(s²+2ζω·s+ω²) | (see table in Franklin et al.) |
| e^{-sT_d} (delay T_d) | z^{-N} where N = T_d/T_s (integer delay) |

---

## Computational Delay Model

In a digital controller, the sequence is:
```
t = n·T_s:   ADC samples v_out[n], i_L[n]
             DSP computes d[n] = controller(v_out[n], ref)   ← takes T_comp time
t ≈ (n+1)·T_s: PWM latch updated with d[n]   ← one cycle delay
```

**Transfer function of delay:**
```
D_delay(z) = z^{-1}   (one-sample computational delay)

In s-domain approximation:
D_delay(s) ≈ e^{-sT_s} ≈ (1 − s·T_s/2) / (1 + s·T_s/2)   [Padé approximation]
```

**Effect on phase margin:**
```
Phase added by delay at crossover f_c:
  φ_delay = −2π · f_c · T_s   [radians]
  φ_delay ≈ −360° · f_c / f_sw  [degrees]

Example: f_c = f_sw/10 → φ_delay = −36°
Reduce PM requirement by φ_delay:
  PM_required_continuous ≥ PM_desired + |φ_delay|
```

---

## Difference Equation Implementation

**Second-order controller (type-II or PID):**
```
G_c(z) = (b0 + b1·z⁻¹ + b2·z⁻²) / (1 + a1·z⁻¹ + a2·z⁻²)

Difference equation:
y[n] = b0·e[n] + b1·e[n-1] + b2·e[n-2] − a1·y[n-1] − a2·y[n-2]
```

```cpp
class Type2Compensator {
    // Coefficients (set from design)
    double b0_, b1_, b2_;
    double a1_, a2_;

    // State (persistent across samples)
    double e_prev1_ = 0.0, e_prev2_ = 0.0;
    double y_prev1_ = 0.0, y_prev2_ = 0.0;

    // Output limits
    double d_min_, d_max_;

public:
    double update(double v_ref, double v_meas) {
        double e = v_ref - v_meas;

        double y = b0_*e + b1_*e_prev1_ + b2_*e_prev2_
                 - a1_*y_prev1_ - a2_*y_prev2_;

        // Clamp output
        double y_clamped = std::clamp(y, d_min_, d_max_);

        // Anti-windup: only update state if output is not saturating
        if (y == y_clamped) {  // not saturating
            e_prev2_ = e_prev1_;
            e_prev1_ = e;
            y_prev2_ = y_prev1_;
            y_prev1_ = y;
        } else {
            // Back-calculate anti-windup: update error history, but limit y history
            e_prev2_ = e_prev1_;
            e_prev1_ = e;
            y_prev2_ = y_prev1_;
            y_prev1_ = y_clamped;  // use clamped value to prevent integrator runaway
        }

        return y_clamped;
    }

    void reset() {
        e_prev1_ = e_prev2_ = y_prev1_ = y_prev2_ = 0.0;
    }
};
```

---

## Sampling Instant and PWM Update Timing

In a symmetrical PWM (triangular carrier), sampling should occur at the triangle peak or valley (no switching noise):

```
Symmetric trailing-edge PWM:
  t_sample = n·T_sw + T_sw/2   (mid-period)
  t_pwm_update = (n+1)·T_sw   (next period, after computation)
  Total delay: 1.5·T_sw average

Symmetric double-update (sample at peak AND valley):
  T_sample = T_sw/2
  Can double control bandwidth
  Requires faster DSP
```

**In discrete-time simulator:**
```cpp
void SimulationLoop::step(double t) {
    // Check if at sampling instant
    double t_in_period = std::fmod(t, T_sw_);
    if (std::abs(t_in_period - T_sample_offset_) < h_/2) {
        double v_meas = circuit_.v_out();
        double d_new  = controller_.update(v_ref_, v_meas);
        // Apply one-cycle delay: store, apply next period
        d_pending_ = d_new;
    }

    // Check if at PWM update instant
    if (std::abs(t_in_period) < h_/2) {
        d_active_ = d_pending_;  // latch new duty cycle
    }

    circuit_.advance(h_, d_active_);
}
```

---

## Z-Domain Loop Gain

```
T(z) = G_c(z) · Z{G_vd} · H_m(z) · H_v

G_c(z)     = discretized compensator
Z{G_vd}    = ZOH-discretized power stage transfer function
H_m(z)     = PWM modulator gain = T_s / (2·V̂_tri)   [ZOH model]
H_v        = output voltage divider (feedback)

Evaluate T(z) on unit circle: z = e^{jω·T_s}
  ω from 0 to π/T_s (Nyquist frequency = f_sw/2)

Phase margin: PM = 180° + ∠T(e^{jω_c·T_s}) at |T|=0 dB
```
