# MNA Formulation

> Reference for: circuit-solver
> Load when: Understanding the Y·x=J system structure, branch current augmentation, or KCL/KVL equation layout

## Basic Nodal Analysis (NA) — Limitations

Standard nodal analysis (Kirchhoff's Current Law only) works only for circuits with current sources and conductances:

```
G·v = I_s

G[i,j] = sum of conductances connected between nodes i and j (negative off-diagonal)
G[i,i] = sum of all conductances connected to node i (positive diagonal)
I_s[i] = sum of current sources flowing INTO node i
```

**Fails for:** voltage sources, inductors (need branch currents as unknowns), controlled sources.

---

## Modified Nodal Analysis (MNA)

MNA extends nodal analysis by augmenting the system with branch current variables for elements that impose voltage constraints.

**System structure:**
```
[G   B] [v]   [I_s]
[C   D] [i] = [E_s]

v = node voltage vector (N×1)
i = branch current vector for augmented elements (M×1)
G = conductance submatrix (N×N) — KCL equations
B = contribution of branch currents to KCL (N×M)
C = contribution of node voltages to KVL (M×N)
D = remaining KVL terms (M×M, often zero or diagonal)
I_s = independent current sources
E_s = independent voltage sources (right-hand side of KVL)
```

Combined as:
```
Y · x = J
Y = [G  B]   size (N+M) × (N+M)
    [C  D]

x = [v]      size (N+M) × 1
    [i]

J = [I_s]    size (N+M) × 1
    [E_s]
```

---

## Ground Node Convention

Node 0 (ground) is the reference — always at voltage 0. Its row and column are **not included** in the matrix.

```cpp
// When stamping: skip contributions to/from node 0
void stamp(MNAMatrix& Y, int p, int q, double G) {
    if (p != 0) Y(p-1, p-1) += G;   // -1 to shift for removed ground row
    if (q != 0) Y(q-1, q-1) += G;
    if (p != 0 && q != 0) {
        Y(p-1, q-1) -= G;
        Y(q-1, p-1) -= G;
    }
}

// Branch current index starts at N_nodes (after all voltage rows)
int branch_idx = N_nodes + branch_counter++;
```

---

## Node Numbering Strategy

```
1. Collect all nodes from netlist.
2. Assign ground = 0.
3. Assign 1..N_nodes to remaining nodes.
4. For each element needing branch current (inductor, V-source, VCVS, transformer winding):
     branch_idx = N_nodes + branch_counter
     branch_counter++
5. Total system size: N_total = N_nodes + N_branches
```

**Good practice:** Number nodes in order of decreasing connectivity (minimize bandwidth) — not required but improves sparse solver performance.

---

## KCL Rows (Node Equations)

For node i, sum of all currents leaving node i = 0:

```
sum_j (G_ij · (v_i − v_j)) + sum_k (I_branch_k,i) = I_source,i

where I_branch_k,i = +i_k if branch k flows away from node i
                   = −i_k if branch k flows into node i
```

---

## KVL Rows (Branch Current Equations)

For a voltage source V_s between nodes p and q with branch current i_k:

```
v_p − v_q = V_s    →   KVL row k: Y[k,p]·v_p + Y[k,q]·v_q = V_s
                         Y[k,p] = +1,  Y[k,q] = −1,  J[k] = V_s

KCL at node p: Y[p,k] = +1  (current from this source flows into node p)
KCL at node q: Y[q,k] = −1  (current flows out of node q)
```

This produces the characteristic MNA pattern:
```
Rows 0..N-1: KCL (conductances and branch current contributions)
Rows N..N+M-1: KVL (voltage constraints)
```

---

## Tableau Analysis (Alternative)

For reference — tableau uses every element's terminal equations directly:

```
[Y_branch  A^T] [v_branch]   [0     ]
[A         0  ] [i_branch] = [I_node]

A = incidence matrix (±1 entries, -1 for ground)
```

MNA is equivalent but more compact (eliminates branch voltages).

---

## Common Singularity Causes

| Cause | Symptom | Fix |
|---|---|---|
| Floating node | Zero diagonal, infinite solution | Ensure every node connects to ground via at least one path |
| Voltage source loop | Two V-sources with no impedance between them | Add series resistance (even small R) or use supernode formulation |
| Current source cutset | KCL has no solution (current into isolated cluster) | Check I-source connectivity |
| Forgotten ground return | Circuit has no path back to ground reference | Add explicit ground connection |
| Duplicate branch index | Two elements share same branch row | Audit branch counter allocation |
| Switch opens isolating a node | Floating node after topology change | Detect isolated nodes after switch event |
