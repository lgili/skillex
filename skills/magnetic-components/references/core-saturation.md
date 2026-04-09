# Core Saturation Modeling

> Reference for: magnetic-components
> Load when: Modeling nonlinear B-H behavior, detecting saturation in simulation, or implementing variable inductance

## Why Saturation Matters in a Simulator

When a magnetic core saturates, its permeability drops sharply — inductance collapses from L_unsat to near zero. In a power converter this causes:

- Sudden current surge (inductor no longer limits di/dt)
- Switch overcurrent and possible destruction (in hardware)
- Massive simulation error if ignored (current runs away)

The simulator must detect the onset of saturation every time step and update the inductance accordingly.

---

## B-H Relationship

```
B = μ_0 · μ_r(H) · H

Unsaturated region (H << H_sat):   μ_r ≈ μ_r_initial  (constant)
Near saturation:                    μ_r decreases
Deeply saturated:                   μ_r → 1  (air-like)

H = N · i / l_c      [A/m]
B = λ / (N · A_c)    [T],  λ = flux linkage = L·i
```

---

## Piecewise-Linear B-H Model

Simplest model compatible with discrete-time stepping:

```
// Slope = μ_0·μ_r in each region
// Saturated: slope drops to μ_0 (free space)

struct BHSegment {
    double H_start, H_end;
    double B_start, slope; // slope = dB/dH = μ_0·μ_r in segment
};

double B_of_H(double H, const std::vector<BHSegment>& bh) {
    for (auto& seg : bh) {
        if (H >= seg.H_start && H < seg.H_end)
            return seg.B_start + seg.slope * (H - seg.H_start);
    }
    // Beyond last segment — saturated
    return bh.back().B_start + bh.back().slope * (H - bh.back().H_start);
}

// Instantaneous inductance:
double L_inst(double i, const std::vector<BHSegment>& bh, double N, double A_c, double l_c) {
    double H = N * i / l_c;
    double mu_eff = dB_dH(H, bh); // derivative at operating point
    return mu_eff * N * N * A_c / l_c;
}
```

**Typical 3-region model:**
| Region | H range | μ_r |
|---|---|---|
| Linear | 0 … 0.8·H_sat | μ_r_initial |
| Transition | 0.8·H_sat … H_sat | decays from μ_r_initial to 1 |
| Saturated | > H_sat | 1 (≈ air) |

---

## Analytical Saturation Models

### Hyperbolic Tangent Model

```
B(H) = B_sat · tanh(H / H_sat)

Advantages: smooth, differentiable, symmetric
L(i) = dλ/di = N·A_c · dB/dH · (N/l_c)
      = N²·A_c/l_c · B_sat/H_sat · sech²(H/H_sat)

In C++:
double mu_eff(double H, double B_sat, double H_sat) {
    double sech = 1.0 / std::cosh(H / H_sat);
    return (B_sat / H_sat) * sech * sech; // dB/dH
}
```

### Jiles-Atherton Model (with Hysteresis)

Five-parameter model capturing both reversible and irreversible magnetization:

```
Parameters: M_s (saturation magnetization), a (shape), k (coercivity),
            c (reversibility), α (mean field)

H_eff = H + α·M
M_an  = M_s · (coth(H_eff/a) − a/H_eff)   [anhysteretic magnetization]

dM/dH = (M_an − M) / (k·δ − α·(M_an − M))   [δ = sign(dH/dt)]

B = μ_0 · (H + M)
```

**Use case:** When hysteresis loop width affects core loss or residual magnetism matters (e.g., transformer inrush).

**Simulator note:** Jiles-Atherton requires tracking dH/dt sign — store previous H value across time steps.

---

## Saturation Detection in the Simulator

```cpp
class SaturableInductor {
    double N_, A_c_, l_c_;
    double B_sat_;
    std::vector<BHSegment> bh_curve_;

public:
    double flux_linkage = 0.0; // state variable — integrate v_L

    // Called each time step after solving for v_L
    void update(double v_L, double dt) {
        flux_linkage += v_L * dt;          // trapezoidal integration preferred
        double B = flux_linkage / (N_ * A_c_);

        if (std::abs(B) > B_sat_ * 0.95) {
            // Approaching saturation — warn or reduce time step
            handle_saturation_onset();
        }
    }

    double inductance() const {
        double i_L = flux_linkage / L_linear_; // approximate for stamp update
        double H   = N_ * i_L / l_c_;
        return mu_eff(H) * N_ * N_ * A_c_ / l_c_;
    }
};
```

**Integration with Newton-Raphson:** When inductance is nonlinear, the Jacobian entry for this element depends on the current operating point. Update L_inst before each NR iteration and stamp it into the admittance matrix.

---

## Air-Gap Effect

An air gap reduces effective permeability and raises H_sat (harder to saturate), at the cost of lower inductance:

```
Reluctance with gap:
  R_total = l_c / (μ_0·μ_r·A_c) + l_g / (μ_0·A_c)
           = R_core + R_gap

Inductance:
  L = N² / R_total

Effective saturation current (onset shifts right with gap):
  I_sat_gapped ≈ B_sat · (l_c/μ_r + l_g) / (μ_0 · N)

For l_g >> l_c/μ_r:
  L ≈ μ_0 · N² · A_c / l_g    (gap-dominated)
  I_sat ≈ B_sat · l_g / (μ_0 · N)
```

---

## Core Loss — Steinmetz Equation

**Classic Steinmetz (sinusoidal excitation only):**
```
P_v = k · f^α · B_pk^β   [W/m³]

P_core = P_v · Vol_core
Vol_core = A_c · l_c

Typical ferrite parameters (e.g., 3C95 at 100 kHz):
  k ≈ 6.5 × 10⁻³,  α ≈ 1.4,  β ≈ 2.5
```

**Modified Steinmetz (MSE) — for non-sinusoidal waveforms:**
```
f_eq = 2/π² · 1/ΔB² · ∫(dB/dt)² dt   [equivalent frequency]
P_v  = k · f_eq^(α-1) · f_sw · B_pk^β
```

**Improved Generalized Steinmetz (iGSE) — most accurate for switching:**
```
P_v = k_i / T_sw · ∫₀^Ts |dB/dt|^α · |ΔB(t)|^(β-α) dt

k_i = k / (2^(β+1) · π^(α-1) · ∫₀^π |cos θ|^α · 2^(β-α) dθ)
```

In a discrete-time simulator:
```cpp
double compute_iGSE(const std::vector<double>& B_waveform,
                    double dt, double k_i, double alpha, double beta) {
    double integral = 0.0;
    double B_max = *std::max_element(B_waveform.begin(), B_waveform.end());
    double B_min = *std::min_element(B_waveform.begin(), B_waveform.end());
    double delta_B = B_max - B_min;
    for (size_t i = 1; i < B_waveform.size(); ++i) {
        double dB_dt = (B_waveform[i] - B_waveform[i-1]) / dt;
        integral += std::pow(std::abs(dB_dt), alpha)
                  * std::pow(delta_B, beta - alpha) * dt;
    }
    return k_i * integral / (B_waveform.size() * dt); // average power density [W/m³]
}
```
