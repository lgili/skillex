# Numerical Integration Methods

> Reference for: solver-numerics
> Load when: Implementing or comparing time-stepping methods for dynamic circuit elements

## Overview Table

| Method | Order | A-stable? | Numerical damping | When to use |
|---|---|---|---|---|
| Forward Euler | 1 | No | None | Never for power circuits |
| Backward Euler | 1 | Yes | High | Startup, post-switch damping |
| Trapezoidal (TR) | 2 | A-stable (not L-stable) | None | Default for all elements |
| TR-BDF2 (Gear-2 variant) | 2 | A-stable + L-stable | Low | Stiff circuits, post-switch |
| GEAR-2 / BDF-2 | 2 | Strongly A-stable | Low | Multi-rate stiff circuits |
| RK4 (explicit) | 4 | No | None | Only for non-stiff post-processing |

---

## Trapezoidal Rule

**Integration:**
```
y[n+1] = y[n] + h/2 · (f(t_n, y[n]) + f(t_{n+1}, y[n+1]))
```

**For a capacitor (i_C = C · dv/dt):**
```
i_C[n+1] = 2C/h · (v[n+1] - v[n]) - i_C[n]

Companion conductance: G_eq = 2C/h
History current:        I_hist = 2C/h · v[n] + i_C[n]

MNA: stamp G_eq, add I_hist to RHS
```

**For an inductor (v_L = L · di/dt):**
```
v_L[n+1] = 2L/h · (i[n+1] - i[n]) - v_L[n]

Companion conductance: G_eq = h/(2L)
History current:        I_hist = i[n] + h/(2L) · v_L[n]

Verify: I_hist should be computed as i_L[n] + G_eq · v_L[n]
```

**Stability:** Trapezoidal is A-stable but not L-stable. After a discontinuity (switch event), it can produce numerical oscillation ("ringing"). Apply one step of backward Euler after each switching event as a damping step.

---

## Backward Euler (BE)

**Integration:**
```
y[n+1] = y[n] + h · f(t_{n+1}, y[n+1])   (fully implicit)
```

**For a capacitor:**
```
i_C[n+1] = C/h · (v[n+1] - v[n])

Companion conductance: G_eq = C/h
History current:        I_hist = C/h · v[n]
```

**For an inductor:**
```
v_L[n+1] = L/h · (i[n+1] - i[n])

Companion conductance: G_eq = h/L
History current:        I_hist = i[n]
```

**Stability:** L-stable — actively damps high-frequency oscillation. More numerical damping than trapezoidal. Use for one step after switching transients, or for finding DC operating point (set h very large → DC solution).

---

## TR-BDF2 (Two-Step Method)

Combines trapezoidal (first half-step) with BDF-2 (second half-step) for A-stable + L-stable behavior:

```
Step 1 (γ fraction of h, typically γ = 2 − sqrt(2)):
  y_{n+γ} = y[n] + γ·h/2 · (f_n + f_{n+γ})   [trapezoidal sub-step]

Step 2:
  y[n+1] = 1/(γ·(2-γ)) · y_{n+γ} − (1-γ)²/(γ·(2-γ)) · y[n] + (1-γ)/(2-γ) · h · f_{n+1}

Benefits: same accuracy as trapezoidal, damps post-event oscillations
Cost: two MNA solves per full time step
```

---

## GEAR-2 / BDF-2

**Integration:**
```
y[n+1] = 4/3 · y[n] − 1/3 · y[n-1] + 2h/3 · f(t_{n+1}, y[n+1])
```

Requires storing two previous time steps.

**For a capacitor (BDF-2):**
```
C · dv/dt ≈ C/(2h/3) · (v[n+1] − 4/3·v[n] + 1/3·v[n-1])

G_eq = 3C/(2h)
I_hist = G_eq · (4/3·v[n] − 1/3·v[n-1]) − i_C_partial   [derive from BDF-2 coefficients]
```

**Strongly A-stable** — better than trapezoidal for stiff systems with high damping requirement.

---

## Switching Event Handling

When a switch fires at time t_sw (not aligned to a step boundary):

```
Option A — Step alignment:
  Reduce h so that t + h = t_sw exactly.
  Restart integration at t_sw with new topology.
  Cost: variable step size management.

Option B — Linear interpolation (post-event):
  Complete the step to t + h using old topology.
  Detect that switch should have fired (check condition at t + h).
  Roll back state to t + h/2, apply BE for one step (damps oscillation).
  Continue with new topology from t + h/2.

Option C — Event-driven with bracketing:
  Detect sign change in switch condition during [t, t+h].
  Bisect to find t_sw within tolerance.
  Restart from t_sw.
  Used in DASSL, SUNDIALS.
```

**Minimum step after event:** After topology change, use backward Euler for 1–3 steps before reverting to trapezoidal. This eliminates post-switching ringing at the cost of slight accuracy loss.

---

## Step Size Selection (Fixed vs. Adaptive)

**Fixed step (default for discrete-time simulator):**
```
h = T_sw / N_steps_per_period

Rule of thumb:
  - 1000 steps/period for 99% accuracy in fundamental voltage
  - 100 steps/period for loss estimation (less sensitive to waveform shape)
  - 10,000 steps/period for switching transient details (t_r, t_f)
```

**LTE-based adaptive step (optional enhancement):**
```
LTE ≈ h³/12 · |d³y/dt³|   [trapezoidal]
LTE ≈ h²/2  · |d²y/dt²|   [backward Euler]

Target: |LTE| < ε_abs + ε_rel·|y|

Step size control:
  h_new = h · (ε / |LTE_est|)^(1/order)
  Apply safety factor: h_new = 0.9 · h_new
  Limit: h_new ≤ 2·h (avoid overly large steps)
```

```cpp
double estimate_lte_trapezoid(double y_prev2, double y_prev1, double y_curr, double h) {
    // Second-order finite difference approximation of d²y/dt²
    double d2y = (y_curr - 2*y_prev1 + y_prev2) / (h*h);
    return h*h*h / 12.0 * std::abs(d2y); // rough LTE estimate
}
```
