---
name: circuit-solver
description: Modified Nodal Analysis (MNA) specialist for power electronics circuit simulators written in C++. Use when building or debugging the netlist-to-matrix pipeline, writing component stamps, handling switch state changes, assembling sparse matrices, or investigating convergence failures caused by ill-conditioned matrices. Trigger for terms like "MNA", "nodal analysis", "stamp", "admittance matrix", "Y matrix", "KCL", "KVL", "branch current", "netlist", "matrix assembly", "sparse matrix", "node numbering", "supernode", or "ground node".
---

# Circuit Solver

## Overview

Use this skill when working on the core simulation engine: the part that takes a circuit netlist, assembles a system of equations, and solves for node voltages and branch currents.

The Modified Nodal Analysis (MNA) method is the standard for SPICE-like simulators. It produces a linear (or linearized) system **Y·x = J** where:
- Y = admittance matrix (conductances + frequency-domain equivalents)
- x = unknown vector [node voltages | branch currents]
- J = right-hand-side (current sources + history terms)

Default stance:

- Ground node (node 0) is always the reference — never assigned a row/column in the matrix.
- Every component contributes to Y and J via a stamp — keep stamps isolated and composable.
- Switches change the circuit topology — re-stamp affected rows/columns when state changes.
- Nonlinear elements are linearized per Newton-Raphson iteration — stamp the Jacobian, not the element's secant.
- Sparse storage (not dense) is required for any circuit with more than ~50 nodes.

## Core Workflow

1. **Number nodes and assign branch current indices.**
   - Assign integer indices to all nodes (0 = ground, 1…N for others).
   - For each element that requires a branch current (inductors, voltage sources, ideal switches, transformers), allocate an extra row/column beyond N.
   - Total system size: M = N_nodes + N_branch_currents.
   - Load `references/mna-formulation.md` for the general MNA equation structure.

2. **Stamp each component.**
   - For every element in the netlist, call its `stamp(Y, J)` method.
   - Each stamp modifies only its own rows/columns — no global knowledge required.
   - Load `references/component-stamps.md` for stamp matrices for every standard element.

3. **Handle topology changes (switches).**
   - When a switch opens or closes, re-stamp the affected rows/columns (zero them first, then re-stamp).
   - Alternatively, maintain a separate stamp structure per switch state and swap at the switching instant.
   - Check for topological errors: floating nodes (isolated from ground) cause singular Y.

4. **Assemble the sparse matrix.**
   - Accumulate stamps into triplet (COO) format: (row, col, value) tuples.
   - Convert to CSR or CSC for efficient LU factorization.
   - Load `references/matrix-assembly.md` for C++ sparse matrix patterns.

5. **Factor and solve.**
   - For linear circuits: factor Y once, solve for multiple RHS vectors.
   - For nonlinear circuits: Newton-Raphson loop — re-stamp linearized Jacobian each iteration.
   - See `solver-numerics` skill for the full NR + time integration loop.

6. **Validate the assembled matrix.**
   - Diagonal entries should generally be positive (admittance-dominated).
   - Check matrix symmetry for passive networks (Y should be symmetric if no controlled sources).
   - Zero diagonal entry means a floating node or missing ground connection.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| MNA equation structure | `references/mna-formulation.md` | Understanding the Y·x=J system, branch current augmentation, or ground reference |
| Component stamps | `references/component-stamps.md` | Writing or debugging stamps for any standard component |
| Sparse matrix assembly | `references/matrix-assembly.md` | Building the C++ data structures for efficient matrix assembly and factorization |

## Constraints

### MUST DO

- Always exclude the ground node (row 0, col 0) from the matrix — stamp accesses to node 0 are silently dropped.
- Zero out stamp contributions before re-stamping a component whose state changed.
- Maintain consistency between the KCL rows (node voltages) and KVL rows (branch currents) — they must correspond to the same physical component.
- Validate circuit topology before solving: check connectivity, at least one ground connection per cluster.
- Document which row indices correspond to which branch currents — this is easy to lose track of.

### MUST NOT DO

- Include row/column 0 in the system matrix — it causes a singular matrix.
- Mix different units within stamps (e.g., mixing conductance in mS with some entries in S).
- Modify shared stamp contributions inside Newton-Raphson without zeroing the previous contribution first.
- Use dense matrix storage for circuits with more than 30–50 nodes.
- Forget to re-stamp after a switch state change — stale stamps cause incorrect solutions.

## Output Template

For circuit solver tasks, provide:

1. Node numbering: which node is ground, how many KCL and KVL rows.
2. Component list and stamp contribution per element.
3. System matrix structure (size, sparsity, symmetry).
4. Switch handling strategy (full re-stamp vs. incremental).
5. Known or suspected error: which stamp or row is wrong and why.
6. Validation: how to verify the assembled matrix is correct.

## Primary References

- Vlach & Singhal — *Computer Methods for Circuit Analysis and Design* (2nd ed.)
- Pillage, Rohrer & Visweswariah — *Electronic Circuit and System Simulation Methods*
- Chua, Desoer & Kuh — *Linear and Nonlinear Circuits*
- SPICE user guide (Berkeley SPICE2G6) — original MNA formulation
