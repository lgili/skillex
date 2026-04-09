# Newton-Raphson Iteration

> Reference for: solver-numerics
> Load when: Implementing the NR loop, diagnosing convergence failure, or tuning damping strategies

## Why Newton-Raphson

The MNA system Y·x = J is linear for resistors, capacitors, and inductors (with companion models). It becomes nonlinear when any element's stamp depends on the solution itself: diodes, saturable inductors, nonlinear resistors, MOSFETs in saturation.

Newton-Raphson linearizes the nonlinear system F(x) = 0 iteratively:
```
J_F(x^k) · Δx = −F(x^k)
x^{k+1} = x^k + Δx

where J_F = Jacobian (dF/dx), the stiffness matrix updated each iteration.
```

In MNA context, F(x) = Y(x)·x − J_rhs(x), so the Jacobian is the updated Y matrix with nonlinear stamps.

---

## NR Loop Structure

```cpp
void solve_nonlinear_step(MNASolver& solver, CircuitState& state, double h) {
    const int MAX_ITER = 100;
    const double EPS_ABS = 1e-9;  // SPICE: 1e-6 V typically, tighter for power
    const double EPS_REL = 1e-3;  // SPICE default

    VectorXd x = state.prev_x; // initial guess = previous step solution

    for (int iter = 0; iter < MAX_ITER; ++iter) {
        // Stamp Jacobian from current x
        SpMat Y(state.N, state.N);
        VectorXd J_rhs = VectorXd::Zero(state.N);

        for (auto* comp : state.components)
            comp->stamp_jacobian(Y, J_rhs, x, h);  // includes history terms

        // Compute F(x) = Y*x - J_rhs
        VectorXd F = Y * x - J_rhs;

        // Solve J_F * Δx = -F
        VectorXd dx = solver.solve(Y, -F);

        // Check convergence
        if (converged(x, dx, EPS_ABS, EPS_REL)) {
            state.x = x + dx;
            return;
        }

        x += dx;  // full Newton step
    }

    // Failed to converge
    throw ConvergenceError("NR did not converge in " + std::to_string(MAX_ITER) + " iterations");
}

bool converged(const VectorXd& x, const VectorXd& dx,
               double eps_abs, double eps_rel) {
    for (int i = 0; i < x.size(); ++i) {
        double tol = eps_abs + eps_rel * std::abs(x(i));
        if (std::abs(dx(i)) > tol) return false;
    }
    return true;
}
```

---

## Convergence Criteria (SPICE-style)

**Voltage nodes:**
```
|Δv_i| < VNTOL + RELTOL · |v_i|
VNTOL = 1e-6 V  (SPICE default, use 1e-9 for precision)
RELTOL = 1e-3   (SPICE default)
```

**Current unknowns (branch currents):**
```
|Δi_k| < ABSTOL + RELTOL · |i_k|
ABSTOL = 1e-12 A  (SPICE default)
```

**Note:** Using absolute tolerance only (no relative) fails for large-signal circuits. Using relative only fails for near-zero signals. Both are required.

---

## Initial Guess Strategy

| Strategy | When to use |
|---|---|
| Previous time step solution | Default — best for small steps |
| Zero vector | Initial DC operating point search |
| Linear solution (ignore NL stamps) | Widely separated operating points |
| Source stepping: ramp V/I sources from 0 to full | Very nonlinear circuits (diodes in deep forward bias at t=0) |

---

## Damping (Limiting Step Size)

Full Newton step may overshoot — especially for diodes and exponential models:

```cpp
// Apply step limiting for diode junction voltage
VectorXd limit_step(const VectorXd& x, const VectorXd& dx) {
    VectorXd x_new = x + dx;
    for (int i : diode_nodes_) {
        double dv = x_new(i) - x(i);
        // Limit diode voltage step to 0.5V
        if (std::abs(dv) > 0.5) {
            x_new(i) = x(i) + std::copysign(0.5, dv);
        }
    }
    return x_new;
}
```

**Source stepping:**
```cpp
// Ramp current/voltage sources from 0 to full over N_steps iterations
for (int step = 1; step <= N_SOURCE_STEPS; ++step) {
    double alpha = static_cast<double>(step) / N_SOURCE_STEPS;
    apply_source_scaling(alpha);
    solve_newton(x);
}
```

**GMIN stepping (add conductance to all nodes, then reduce):**
```
G_min = initial_gmin (e.g., 1e-9 S)
repeat:
  solve with G_min shunted to ground from every node
  reduce G_min by factor 10
  until G_min < normal_gmin (e.g., 1e-12 S)
```

---

## Diagnosing Non-Convergence

**Symptom → Root cause → Fix:**

| Symptom | Likely cause | Diagnosis | Fix |
|---|---|---|---|
| NR oscillates (Δx flip-flops) | Poor initial guess or discontinuous Jacobian | Print x and Δx per iteration | Source stepping or step limiting |
| NR diverges (Δx grows each iter) | Unstable Jacobian, near-singular Y | Print ||Δx|| per iteration | GMIN stepping, reduce time step |
| NR converges to wrong solution | Multiple solutions, bad initial guess | Try different initial x | Continuation method, homotopy |
| NR slow to converge (many iters) | Tight tolerance + slow convergence region | Count iterations | Relax tolerance or use line search |
| First iteration diverges | Incorrect Jacobian (wrong sign, missing term) | Finite-difference check on J | Audit stamp Jacobian vs. finite difference |
| Converges only at certain steps | State-dependent Jacobian | Check which element stamps change | Verify history state passed correctly |

**Jacobian verification by finite difference:**
```cpp
// Compare analytical Jacobian to numerical finite difference
void verify_jacobian(const VectorXd& x, double h_fd = 1e-7) {
    SpMat J_analytic = compute_jacobian(x);
    for (int j = 0; j < x.size(); ++j) {
        VectorXd x_plus  = x; x_plus(j)  += h_fd;
        VectorXd x_minus = x; x_minus(j) -= h_fd;
        VectorXd col = (F(x_plus) - F(x_minus)) / (2 * h_fd);
        for (int i = 0; i < x.size(); ++i) {
            double err = std::abs(J_analytic.coeff(i,j) - col(i));
            if (err > 1e-4 * (1 + std::abs(J_analytic.coeff(i,j))))
                std::cerr << "Jacobian mismatch at (" << i << "," << j
                          << "): analytic=" << J_analytic.coeff(i,j)
                          << ", fd=" << col(i) << "\n";
        }
    }
}
```

---

## DC Operating Point

Before time-domain simulation, find the initial DC operating point (all derivatives = 0):

```
Replace inductors with short circuits (V = 0, i_L = DC current)
Replace capacitors with open circuits (I = 0, V = DC voltage)
Solve resulting resistive + controlled-source network by NR

Set initial history state:
  i_L[0] = DC_inductor_current
  v_C[0] = DC_capacitor_voltage
```

```cpp
State find_dc_op(const Circuit& circuit) {
    // Stamp all elements with dt → ∞ (backward Euler with huge h)
    double h_dc = 1e30;  // effectively infinite
    SpMat Y_dc; VectorXd J_dc;
    circuit.stamp_all(Y_dc, J_dc, h_dc, IntMethod::BACKWARD_EULER);

    // Solve by NR starting from zero
    VectorXd x = VectorXd::Zero(circuit.N);
    solve_newton(x, Y_dc, J_dc);
    return circuit.extract_state(x);
}
```
