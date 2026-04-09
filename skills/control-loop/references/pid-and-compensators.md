# PID and Compensators

> Reference for: control-loop
> Load when: Designing type-I/II/III compensators, implementing anti-windup, or adding current-mode control

## Compensator Types Summary

| Type | Poles | Zeros | Phase boost | Used for |
|---|---|---|---|---|
| Type-I (PI) | 1 at origin | 1 | Up to 90° lag | Low-bandwidth, simple plants |
| Type-II | 1 at origin + 1 | 1 | Up to 90° lead | Buck (1 LC resonance) |
| Type-III | 1 at origin + 2 | 2 | Up to 180° lead | Boost, buck-boost (RHP zero) |
| PID | 1 at origin + 1 | 2 (D approximated) | Up to 90° lead | Varied; add D-filter |

---

## Type-II Compensator (Standard for Buck)

```
G_c(s) = K · (1 + s/ω_z) / (s · (1 + s/ω_p))

Poles:  one at origin (integral), one at ω_p
Zero:   one at ω_z

Design procedure:
1. Set f_c = target crossover (< f_sw/5)
2. Place zero f_z1 = f_0/Q  or  f_z1 ≈ f_c/3
   where f_0 = 1/(2π√LC), Q = R√(C/L)
3. Place pole f_p1 = f_sw/2  (attenuate switching noise)
4. Set K so |G_c(jωc)| · |G_vd(jωc)| · H_m · H_v = 1

ω_z = 2π·f_z1
ω_p = 2π·f_p1
K   = ω_c / (H_m · H_v · |G_vd(jωc)| · (ω_c/ω_z) / sqrt(1+(ω_c/ω_p)²))
```

---

## Type-III Compensator (for Boost or High-Bandwidth)

```
G_c(s) = K · (1+s/ω_z1)·(1+s/ω_z2) / [s · (1+s/ω_p1)·(1+s/ω_p2)]

Design procedure:
1. Set f_c as desired
2. Place zeros at LC resonance: f_z1 = f_z2 ≈ f_0/sqrt(Q) or slightly below f_0
3. Place p1 to cancel one zero effect: f_p1 ≈ f_0·Q
4. Place p2 at f_sw/2
5. Set K as before

Maximum phase boost: 180° (two zeros each give 90° max at midpoint)
```

---

## PID — Parallel Form

```
G_PID(s) = K_p + K_i/s + K_d·s / (1 + s/ω_N)

K_p = proportional gain
K_i = integral gain (eliminates DC error)
K_d = derivative gain (phase lead)
ω_N = derivative filter pole (1/ω_N is derivative time constant filter, avoids pure differentiator)

From PI/PD view:
  PI:  K_p·(1 + ω_i/s), ω_i = K_i/K_p
  PD:  K_p·(1 + s/ω_d), ω_d = K_d·ω_N/K_p (at mid-frequency)
```

**Discrete PID difference equation:**
```cpp
class PID {
    double Kp_, Ki_, Kd_, N_; // N = derivative filter coefficient
    double T_s_;

    // Tustin discretization coefficients
    double b0_, b1_, b2_;
    double a1_, a2_;

    double e_prev1_ = 0, e_prev2_ = 0;
    double y_prev1_ = 0, y_prev2_ = 0;

public:
    PID(double Kp, double Ki, double Kd, double N, double T_s) {
        // Tustin bilinear with prewarping at crossover (simplified here without prewarping)
        double a = 2.0/T_s;
        b0_ =  Kp + Ki*T_s/2 + Kd*a*N/(a+N);
        b1_ = -Kp + Ki*T_s/2 - Kd*a*N*(a-N)/(a*(a+N));  // expand...
        // Full derivation: substitute s=(2/Ts)*(z-1)/(z+1) into G_PID(s)
        // and collect terms. Use CAS for exact coefficients.
    }

    double compute(double e) {
        double y = b0_*e + b1_*e_prev1_ + b2_*e_prev2_
                 - a1_*y_prev1_ - a2_*y_prev2_;
        e_prev2_ = e_prev1_; e_prev1_ = e;
        y_prev2_ = y_prev1_; y_prev1_ = y;
        return y;
    }
};
```

---

## Anti-Windup

Integrator windup occurs when the controller output saturates (e.g., duty cycle clamped at 100%). The integrator keeps accumulating error, causing large overshoot when the plant comes out of saturation.

### Back-Calculation Anti-Windup

```
u_sat = clamp(u, u_min, u_max)
e_aw  = u_sat - u              ← windup error signal
integrator += (e + K_aw·e_aw) · T_s   ← feed back clamping error

K_aw = 1/T_i (proportional to integral time constant, or tune separately)
```

```cpp
class IntegratorWithAntiWindup {
    double integral_  = 0.0;
    double K_i_, K_aw_;
    double u_min_, u_max_;

public:
    double update(double error, double T_s) {
        double u_unclamped = integral_;
        double u_clamped   = std::clamp(u_unclamped, u_min_, u_max_);
        double e_aw = u_clamped - u_unclamped; // zero when not saturating

        integral_ += T_s * (K_i_ * error + K_aw_ * e_aw);
        return u_clamped;
    }
};
```

### Conditional Integration (Stop Integrating When Saturated)

Simpler but less smooth:
```cpp
if (output >= u_max && error > 0) return; // don't integrate
if (output <= u_min && error < 0) return; // don't integrate
integral_ += K_i * error * T_s;
```

---

## Current-Mode Control

Inner current loop (fast, inner), outer voltage loop (slow, outer).

**Peak current mode:**
- Comparator resets switch when i_L hits the current reference I_ref[n].
- Slope compensation needed for D > 0.5 to prevent subharmonic oscillation.
- In simulation: at each time step, check if i_L ≥ I_ref. If yes, turn switch OFF.

**Average current mode:**
- Inner loop tracks average i_L to a current reference set by the outer voltage loop.
- Inner compensator G_ci(s) is a simple PI (1 zero), outer G_cv(s) is standard type-II.

```
Outer voltage loop:  V_ref − v_out → G_cv(s) → I_ref
Inner current loop:  I_ref − i_L   → G_ci(s) → duty cycle
```

**Digital implementation in simulator:**
```cpp
// Outer voltage loop — runs at full control frequency
double I_ref = outer_pi_.update(v_ref - v_out, T_s);
I_ref = std::clamp(I_ref, 0.0, I_max);

// Inner current loop — runs at same frequency
double d = inner_pi_.update(I_ref - i_L_avg, T_s);
d = std::clamp(d, D_min, D_max);
```
