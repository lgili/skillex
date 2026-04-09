# Component Stamps

> Reference for: circuit-solver
> Load when: Writing or debugging MNA stamps for any standard circuit element

## Notation

- `p`, `q` = positive and negative terminal node indices (0 = ground, skip those rows/cols)
- `k` = branch current index (augmented row/column in MNA matrix, starts at N_nodes)
- `G`, `C`, `L`, `V`, `I` = component value
- `h` = time step

---

## Resistor (Conductance G = 1/R)

```
       p   q
p  [ +G  -G ]
q  [ -G  +G ]

RHS: no contribution

Condition: p=0 → skip row p; q=0 → skip row q
```

---

## Conductance (equivalent to Resistor)

Same as resistor above with G directly.

---

## Independent Current Source (I flowing from q to p)

```
RHS:
p  [ +I ]
q  [ -I ]

No Y matrix contribution.
```

---

## Independent Voltage Source (V_s, branch current i_k in row k)

```
       p   q   k
p  [        +1  ]  → KCL: i_k flows into p
q  [        -1  ]  → KCL: i_k flows out of q
k  [ +1  -1     ]  → KVL: v_p - v_q = V_s

RHS:
k  [ V_s ]
```

---

## Capacitor (trapezoidal, Geq = 2C/h)

Companion model: conductance G_eq = 2C/h, current source I_hist = 2C/h · v_C[n-1] + i_C[n-1]

```
       p   q
p  [ +G_eq  -G_eq ]
q  [ -G_eq  +G_eq ]

RHS:
p  [ +I_hist ]
q  [ -I_hist ]

I_hist = G_eq · v_C[n-1] + i_C[n-1]
       = (2C/h) · (v_p - v_q)[n-1] + i_C[n-1]
```

Forward Euler (explicit): G_eq = 0, I_hist = C/h · v_C[n-1]

---

## Inductor (trapezoidal, branch current i_k in row k)

Companion model: conductance G_eq = h/(2L), I_hist = i_k[n-1] + (h/2L)·(v_p-v_q)[n-1]

```
       p   q   k
p  [        +1  ]
q  [        -1  ]
k  [ +1  -1  -h/(2L) ]

RHS:
k  [ I_hist ] = i_k[n-1] + (h/2L)·(v_p-v_q)[n-1]
```

Alternative (capacitive companion, simpler for nonlinear analysis):
Replace KVL row with: G_eq stamp directly in KCL rows.
```
       p   q
p  [ +G_eq  -G_eq ]
q  [ -G_eq  +G_eq ]
RHS:
p  [ +I_hist ]
q  [ -I_hist ]
```
Both formulations are equivalent; the KVL-branch form is preferred when you need to extract i_L directly.

---

## Voltage-Controlled Current Source (VCCS): I = G_m · (v_c+ − v_c−)

```
Control nodes: c+, c−
Output nodes: p, q

       p   q   c+   c−
p  [        +G_m  -G_m ]
q  [        -G_m  +G_m ]

RHS: none
```

---

## Voltage-Controlled Voltage Source (VCVS): V_out = μ · (v_c+ − v_c−), branch current i_k

```
       p   q   c+  c−   k
p  [                   +1  ]
q  [                   -1  ]
c+ [                       ]
c− [                       ]
k  [ +1  -1  -μ  +μ        ]  KVL row

RHS:
k  [ 0 ]
```

---

## Current-Controlled Current Source (CCCS): I_out = α · i_control, control branch k_c

```
       p   q   k_c
p  [        +α  ]
q  [        -α  ]

RHS: none (α stamped into row p, q at column k_c)
```

---

## Current-Controlled Voltage Source (CCVS): V_out = R_m · i_control, branches k_c, k_out

```
       p   q   k_c  k_out
p  [                 +1  ]
q  [                 -1  ]
k_out [ +1  -1  -R_m     ]

RHS: none
```

---

## Ideal Switch (ON = short, OFF = open)

**ON state** (short circuit, branch current i_k):
```
Same stamp as a voltage source with V_s = 0:
       p   q   k
p  [        +1  ]
q  [        -1  ]
k  [ +1  -1     ]
RHS: k [ 0 ]
```

**OFF state** (open circuit):
```
No stamp — rows/cols for p and q only affected by other elements.
```

**Topology change:** When switch state changes, zero out the current stamp rows and re-stamp. If using sparse incremental assembly, mark affected entries as dirty.

---

## Nonlinear Resistor (Newton-Raphson linearization)

At each NR iteration, linearize around current operating point V0:

```
I(V) ≈ I(V0) + G_eq · (V − V0)    where G_eq = dI/dV at V0

Stamp G_eq as conductance:
  Y(p,p) += G_eq;  Y(p,q) -= G_eq;
  Y(q,p) -= G_eq;  Y(q,q) += G_eq;

Stamp Norton equivalent current source (history current):
  I_eq = I(V0) − G_eq · V0
  RHS(p) -= I_eq;  (sign: current flows from q to p)
  RHS(q) += I_eq;
```

---

## Summary Table

| Element | Y matrix entries | RHS entries | Branch current row? |
|---|---|---|---|
| Resistor R | G = 1/R at (p,p), (q,q), −G at (p,q), (q,p) | None | No |
| Capacitor C | G_eq = 2C/h same pattern | ±I_hist | No |
| Inductor L | +1/−1 at (p,k), (q,k), (k,p), (k,q); −h/2L at (k,k) | I_hist at k | Yes |
| V-source V_s | +1 at (p,k), −1 at (q,k), +1 at (k,p), −1 at (k,q) | V_s at k | Yes |
| I-source I_s | None | +I at p, −I at q | No |
| VCCS G_m | ±G_m at (p,c+), (p,c−), (q,c+), (q,c−) | None | No |
| VCVS μ | Same as V-source plus ∓μ at (k,c+), (k,c−) | 0 at k | Yes |
| Ideal switch ON | Same as V-source, V_s=0 | 0 | Yes |
| Ideal switch OFF | None | None | No |
