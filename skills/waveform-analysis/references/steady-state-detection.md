# Steady-State Detection

> Reference for: waveform-analysis
> Load when: Detecting convergence to periodic steady state in simulation output

## Definition

A simulation has reached periodic steady state when all state variables (node voltages, inductor currents, capacitor voltages) are periodic with the same period T as the excitation (switching period or fundamental period):

```
x(t + T) ≈ x(t)    for all t  (within tolerance)

Equivalently: |x(t+T) - x(t)| / max(|x|, ε_abs) < ε_rel
```

---

## Method 1: Cycle-by-Cycle Comparison

Compare the state vector at corresponding instants in consecutive switching cycles:

```cpp
class SteadyStateDetector {
    double eps_rel_v_ = 1e-3;  // 0.1% voltage tolerance
    double eps_rel_i_ = 1e-3;  // 0.1% current tolerance
    double eps_abs_   = 1e-9;  // prevents division by zero

    std::vector<double> prev_cycle_end_state_;
    int cycle_count_ = 0;

public:
    bool check(const SimState& state_at_period_end) {
        if (prev_cycle_end_state_.empty()) {
            prev_cycle_end_state_ = state_at_period_end.as_vector();
            ++cycle_count_;
            return false;
        }

        auto curr = state_at_period_end.as_vector();
        bool converged = true;

        for (size_t i = 0; i < curr.size(); ++i) {
            double ref = std::max(std::abs(prev_cycle_end_state_[i]), eps_abs_);
            double err = std::abs(curr[i] - prev_cycle_end_state_[i]) / ref;
            if (err > eps_rel_v_) {
                converged = false;
                break;
            }
        }

        prev_cycle_end_state_ = curr;
        ++cycle_count_;
        return converged;
    }

    int cycles_elapsed() const { return cycle_count_; }
};
```

---

## Method 2: RMS Convergence

Monitor output RMS across consecutive windows. Stop when RMS change per cycle < threshold:

```cpp
double prev_rms = 0.0;
for (int cycle = 0; ; ++cycle) {
    simulate_one_cycle();
    double rms = compute_rms(v_out_last_cycle);
    double delta_rms = std::abs(rms - prev_rms) / std::max(rms, 1e-9);
    if (delta_rms < 1e-4 && cycle > MIN_CYCLES) break;
    prev_rms = rms;
}
```

**Caution:** RMS convergence is a weaker criterion than cycle-by-cycle state comparison. A circuit may have converged in average but still have transient in harmonic content.

---

## Method 3: Shooting Method (Exact Steady State)

Find initial conditions x_0 such that x(T) = x_0 exactly (periodic boundary condition):

```
F(x_0) = x(T; x_0) - x_0 = 0    (find x_0 that closes the orbit)

Solve by Newton-Raphson:
  J_shoot · Δx_0 = −F(x_0)
  x_0 ← x_0 + Δx_0

J_shoot = ∂x(T)/∂x_0 - I  (monodromy matrix - identity)
```

**Advantages:** Converges to exact periodic solution in a few iterations regardless of time constant.
**Disadvantages:** Requires computing the monodromy matrix (N_state time-domain simulations per NR iteration — expensive).

```cpp
Eigen::MatrixXd compute_monodromy(const Circuit& circuit,
                                   const Eigen::VectorXd& x0, double T) {
    int N = x0.size();
    Eigen::MatrixXd M = Eigen::MatrixXd::Zero(N, N);
    double h = 1e-6 * x0.norm() + 1e-12; // perturbation

    for (int j = 0; j < N; ++j) {
        Eigen::VectorXd x_plus = x0;
        x_plus(j) += h;
        Eigen::VectorXd x_T_plus = simulate_to(circuit, x_plus, T);

        Eigen::VectorXd x_T = simulate_to(circuit, x0, T);
        M.col(j) = (x_T_plus - x_T) / h;
    }
    return M;
}
```

---

## Practical Guidelines

### Minimum Cycles Before Checking

Power electronics circuits have dominant time constants set by their control loop and output filter:

```
τ_dominant = max(L/R, R·C, 1/ω_crossover)

Required cycles before checking steady state:
  N_min ≈ 5 · τ_dominant / T_sw

Example: Buck converter, L/R = 1 ms, T_sw = 10 µs
  N_min ≈ 5 × 1 ms / 10 µs = 500 cycles
```

**Never check before N_min cycles** — the transient will give false "converged" results at a local plateau.

### Convergence Tolerances

| Signal type | eps_rel | eps_abs |
|---|---|---|
| Node voltage | 1e-3 (0.1%) | 1 mV |
| Inductor current | 1e-3 | 1 µA |
| Capacitor voltage | 1e-3 | 1 mV |
| Power | 1e-2 (1%) | 1 mW |

For loss estimation, tighter tolerances are needed. For waveform shape, cycle-by-cycle comparison is more important than RMS tolerance.

---

## Accelerating Convergence

### Latency Insertion Method (LIM)

Apply artificial damping at simulation start to accelerate convergence, remove damping for accurate steady-state:

```
Normal simulation: n · T_sw cycles with full accuracy
LIM: use higher numerical damping (backward Euler, larger virtual R) for first N/10 cycles
     → reaches near-steady-state 5-10x faster
     → remove damping for last N/10 cycles → exact steady state
```

### Frequency-Domain Initialization

For periodic steady state, start from the analytical steady-state solution as initial conditions:

```
Compute DC operating point analytically (from converter equations)
Set: v_C(0) = V_out, i_L(0) = I_out
This skips the startup transient entirely → only need ~5-10 cycles for full steady state
```

```cpp
SimState compute_dc_initial_state(double V_in, double D, double L, double C, double R) {
    SimState x0;
    x0.v_C = D * V_in;           // buck: V_out = D * V_in
    x0.i_L = D * V_in / R;       // I_out = V_out / R
    return x0;
}
```
