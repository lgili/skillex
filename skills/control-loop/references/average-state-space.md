# Averaged State-Space Plant Models

> Reference for: control-loop
> Load when: Discretizing the power stage for Z-domain loop gain analysis or verifying control design against simulation

## Why Average Models for Digital Control Design

Switching converters have two time scales:
- **Switching frequency** f_sw: fast, handled by the circuit simulator
- **Control bandwidth** f_c << f_sw: slow, handled by the averaged model

The averaged model "averages out" the switching to produce a smooth continuous-time or discrete-time transfer function usable for compensator design and stability analysis.

---

## Continuous Averaged Model (State-Space)

From state-space averaging (see `power-electronics` skill), the small-signal model is:

```
ẋ = Ā·x̂ + B̄_d·d̂ + B̄_g·v̂_g
ŷ = C̄·x̂

Ā = D·A1 + (1-D)·A2    (averaged state matrix)
B̄ = D·B1 + (1-D)·B2    (averaged input matrix)
C̄ = C (typically [0 1] to extract v_C)

Buck example:
Ā = [  0    -1/L ]    B̄_d = [ V_in/L ]
    [ 1/C  -1/RC ]           [   0    ]
```

---

## ZOH Discretization of Plant

Convert continuous averaged model to discrete time using ZOH:

```
x[n+1] = Φ·x[n] + Γ·d[n]
y[n]   = C·x[n]

Φ = e^{Ā·T_s}            (matrix exponential)
Γ = Ā^{-1}·(Φ − I)·B̄_d  (ZOH integral)

Z-domain transfer function:
G_vd(z) = C·(zI − Φ)^{-1}·Γ
```

**Computing matrix exponential in C++:**
```cpp
#include <Eigen/Dense>

Eigen::Matrix2d A_c;
A_c << 0, -1.0/L,
       1.0/C, -1.0/(R*C);

double T_s = 1.0 / f_sw;

// Matrix exponential (Eigen doesn't have built-in — use scaling + squaring or expm)
// For 2×2, can use analytical formula:
// For general: use Eigen Unsupported MatrixFunctions
#include <unsupported/Eigen/MatrixFunctions>
Eigen::Matrix2d Phi = (A_c * T_s).exp();

// Gamma = A_c^{-1} * (Phi - I) * B_d
Eigen::Vector2d B_d(V_in/L, 0.0);
Eigen::Matrix2d I2 = Eigen::Matrix2d::Identity();
Eigen::Vector2d Gamma = A_c.inverse() * (Phi - I2) * B_d;
```

---

## Discrete-Time Loop Gain Computation

```cpp
// Evaluate G_vd(z) at each frequency point ω
std::vector<std::complex<double>> compute_Gvd_discrete(
    const Eigen::Matrix2d& Phi, const Eigen::Vector2d& Gamma,
    const Eigen::RowVector2d& C, double T_s, int N_points) {

    std::vector<std::complex<double>> G_vd(N_points);
    for (int k = 0; k < N_points; ++k) {
        double omega = M_PI * k / (N_points * T_s); // 0 to π/T_s
        std::complex<double> z = std::exp(std::complex<double>(0, omega * T_s));
        Eigen::Matrix2cd zI_minus_Phi = z * Eigen::Matrix2cd::Identity() - Phi.cast<std::complex<double>>();
        auto inv = zI_minus_Phi.inverse();
        G_vd[k] = (C.cast<std::complex<double>>() * inv * Gamma.cast<std::complex<double>>())(0);
    }
    return G_vd;
}
```

---

## Sample-and-Hold Effect (ZOH in Feedback Path)

The ADC samples v_out once per period — this is equivalent to a ZOH in the feedback path:

```
H_ZOH(s) = (1 − e^{-sT_s}) / s   ← ZOH continuous-time model

Phase contribution of ZOH at frequency f:
  φ_ZOH = −π·f·T_s   [radians]
  φ_ZOH ≈ −180°·f/f_sw  [degrees]

Combined with computational delay e^{-sT_s}:
  Total phase lag ≈ −270°·f/f_sw  [at f_c = f_sw/10: −27° extra phase lag]
```

**Critical for stability analysis:** At f_c = f_sw/10, total extra phase lag from ZOH + delay ≈ 27°. Design compensator PM without delay, then verify it holds after subtracting this.

---

## Discrete-Time Stability Check

```cpp
// Check stability: all eigenvalues of Φ must be inside unit circle
void check_open_loop_stability(const Eigen::Matrix2d& Phi) {
    Eigen::EigenSolver<Eigen::Matrix2d> es(Phi);
    for (auto& ev : es.eigenvalues()) {
        if (std::abs(ev) > 1.0) {
            std::cerr << "Unstable eigenvalue: |λ| = " << std::abs(ev) << "\n";
        }
    }
}

// For closed-loop: check eigenvalues of (Phi - Gamma*K) where K is feedback gain
// Or evaluate T(z) = G_c(z) * G_vd(z) * Hm * Hv
// Phase margin: find ω where |T(e^{jωTs})| = 1, measure angle from -180°
```

---

## Gain and Phase from Simulation (Open-Loop Injection)

If the analytical model is not trusted, measure loop gain directly in the running simulator:

```
1. Break the loop at a suitable node (e.g., between compensator output and plant input).
2. Inject sinusoid v_inj(t) = A·sin(ωt) at the break.
3. Measure signals at both sides of the break: v_before(t), v_after(t).
4. Compute T(jω) = V_after / V_before using DFT.
5. Sweep ω to build Bode plot.

Phase margin: ω where |T| = 0 dB → PM = 180° + ∠T
```

This is the same injection method used on real hardware (AP Instruments, Venable) — validating the simulation model against hardware measurements verifies both the plant model and the controller implementation.
