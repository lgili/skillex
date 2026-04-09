# Coupled-Inductor MNA Stamps

> Reference for: magnetic-components
> Load when: Writing C++ MNA stamps for transformers, coupled inductors, or nonlinear inductors

## Inductor Stamp (Single, Linear)

For an inductor L between nodes p and q with branch current i_L as an auxiliary variable (row/column k):

**Trapezoidal discretization (preferred for stability):**
```
v_L = L · di_L/dt  →  using trapezoidal:
v_L[n] = (2L/h) · i_L[n] - (2L/h) · i_L[n-1] - v_L[n-1]

Companion model: conductance G_eq = h/(2L), current source I_eq = i_L[n-1] + (h/(2L))·v_L[n-1]
```

**MNA stamp contribution** (nodes p, q; branch current in row k):
```
            p       q       k
p  [  ...  +G_eq  -G_eq  +1  ...]
q  [  ...  -G_eq  +G_eq  -1  ...]
k  [  ...  +1     -1      0  ...]

RHS at row k: +I_eq (= i_L[n-1] + (h/2L)·v_L[n-1])
```

---

## Two-Winding Coupled Inductor Stamp

Winding 1: nodes (p1, q1), current i_1, branch index k1
Winding 2: nodes (p2, q2), current i_2, branch index k2

Mutual inductance M = k_12 · sqrt(L1 · L2)

**Coupled voltage equations:**
```
v_1 = L1·(di_1/dt) + M·(di_2/dt)
v_2 = M·(di_1/dt) + L2·(di_2/dt)
```

**Trapezoidal discretization:**
```
[v_1]   [2L1/h   2M/h ] [i_1[n]]   [i_1_hist]
[v_2] = [2M/h   2L2/h ] [i_2[n]] − [i_2_hist]

where i_j_hist = i_j[n-1] + (h/2)·(v_j[n-1] + v_j[n-1]_coupled) (from previous step)
```

**MNA stamp** (4 KVL rows for v_1, v_2 and 4 KCL contributions):
```
Conductance matrix block (Y_coupled = inv(Z)):

Z = h/2 · [L1  M ]^(-1) = h/(2·(L1·L2-M²)) · [ L2  -M]
          [M   L2]                              [-M   L1]

G11 = h·L2  / (2·det)
G12 = -h·M  / (2·det)
G21 = -h·M  / (2·det)   (= G12, symmetric)
G22 = h·L1  / (2·det)
det = L1·L2 - M²

MNA stamp in rows/cols (p1, q1, p2, q2):
     p1     q1     p2     q2
p1 [+G11  -G11  +G12  -G12]
q1 [-G11  +G11  -G12  +G12]
p2 [+G21  -G21  +G22  -G22]
q2 [-G21  +G21  -G22  +G22]

RHS:
  J_p1 = +(G11·v1_hist + G12·v2_hist) * (i_1[n-1] + ...)  [history current source at p1]
  ... (derive from trapezoidal companion for each winding)
```

---

## Ideal Transformer Stamp

An ideal transformer (turns ratio n = N1/N2) imposes:
- Voltage constraint: v_1 = n · v_2
- Current constraint: i_1 = −i_2 / n

**VCVS representation** (add branch current k1 for primary, k2 for secondary):
```
Rows k1, k2 (KVL/constraint equations):
  k1:  v_p1 − v_q1 − n·(v_p2 − v_q2) = 0
  k2:  i_1  + i_2/n = 0

MNA stamp (current branch rows k1, k2):
       p1   q1   p2   q2   k1   k2
k1  [  +1   -1   -n   +n    0    0  ]   = 0  (voltage constraint)
k2  [   0    0    0    0   +1   1/n ]   = 0  (current constraint)

KCL at nodes from branch currents:
p1:  +i_k1
q1:  -i_k1
p2:  +i_k2
q2:  -i_k2
```

---

## Non-Ideal Transformer — Full Stamp Decomposition

Decompose into primitives that can each be individually stamped:

```
Primary terminal
    → R_p stamp (winding resistance)
    → L_lk_p stamp (leakage inductor)
    → Mutual L_m stamp (coupled to secondary)
    → Ideal xfmr stamp (1:n voltage/current constraint)
    → L_lk_s stamp (secondary leakage, referred)
    → R_s stamp (secondary winding resistance, referred)
Secondary terminal

R_c (core loss) stamps in parallel with L_m node.
```

**Stamp order in C++:**
```cpp
void NonIdealTransformer::stamp(MNAMatrix& Y, MNAVector& I) const {
    rp_.stamp(Y, I);           // primary winding resistance
    llkp_.stamp(Y, I);         // primary leakage
    lm_.stamp(Y, I);           // magnetizing inductance (possibly nonlinear)
    rc_.stamp(Y, I);           // core loss conductance (Gc = 1/R_c)
    ideal_xfmr_.stamp(Y, I);   // KVL/KCL constraint rows
    llks_.stamp(Y, I);         // secondary leakage (referred)
    rs_.stamp(Y, I);           // secondary winding resistance (referred)
}
```

---

## Nonlinear Inductor Stamp (Saturable)

When L = L(i), the inductor stamp must be updated each Newton-Raphson iteration:

```cpp
void SaturableInductor::stamp_jacobian(MNAMatrix& J, double i_current) const {
    // Compute linearized conductance at current operating point
    double L_inst = compute_L_instantaneous(i_current);
    double G_eq   = h / (2.0 * L_inst);

    // Stamp as a regular inductor companion model with updated G_eq
    int p = node_p_, q = node_q_, k = branch_idx_;
    J(p, p) += G_eq;  J(p, q) -= G_eq;
    J(q, p) -= G_eq;  J(q, q) += G_eq;
    J(p, k) += 1.0;   J(q, k) -= 1.0;
    J(k, p) += 1.0;   J(k, q) -= 1.0;

    // History current (from previous step state)
    double I_hist = prev_i_L_ + G_eq * prev_v_L_;
    rhs_(p) += I_hist;
    rhs_(q) -= I_hist;
}

double SaturableInductor::compute_L_instantaneous(double i) const {
    double H = N_ * std::abs(i) / l_c_;
    double mu = bh_.dB_dH(H); // derivative of B-H curve at H
    return mu * N_ * N_ * A_c_ / l_c_;
}
```

**Newton-Raphson loop:**
```
For each NR iteration:
  1. Compute i_L from current solution vector x
  2. Call stamp_jacobian(J, i_L)  → updates G_eq in J
  3. Solve J·Δx = −F(x)
  4. Update x = x + Δx
  5. Check convergence: ||Δx|| < tol_abs + tol_rel·||x||
```
