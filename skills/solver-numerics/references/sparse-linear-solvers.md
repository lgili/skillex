# Sparse Linear Solvers

> Reference for: solver-numerics
> Load when: Choosing factorization backend, optimizing solver performance, or debugging factorization failures

## Solver Selection Guide

| Solver | Library | Method | Best for |
|---|---|---|---|
| `SparseLU` | Eigen | Left-looking LU + COLAMD | General asymmetric circuits, small-medium size |
| `SparseQR` | Eigen | QR factorization | Over-determined systems (rarely needed for MNA) |
| `UMFPACK` | SuiteSparse | Multifrontal LU + AMD | Large circuits (>1000 nodes), production use |
| `KLU` | SuiteSparse | Blocked LU | Power system networks, very sparse |
| `pardiso` | Intel MKL | Parallel LU | Large circuits, multi-core systems |
| `Cholmod` | SuiteSparse | Cholesky | Symmetric positive definite only (not typical MNA) |

**Default choice for this simulator:** Eigen `SparseLU` — header-only, no external dependency, sufficient for power electronics circuits (typically <500 nodes).

**Switch to UMFPACK** when circuit has >500 nodes or when factorization time dominates simulation time.

---

## Eigen SparseLU Usage

```cpp
#include <Eigen/Sparse>
#include <Eigen/SparseLU>

using SpMat = Eigen::SparseMatrix<double>;
using Vec   = Eigen::VectorXd;

class SparseLUSolver {
    Eigen::SparseLU<SpMat, Eigen::COLAMDOrdering<int>> lu_;
    bool analyzed_ = false;

public:
    // Symbolic analysis (only needs to be called when sparsity pattern changes,
    // i.e., when circuit topology changes)
    void analyze(const SpMat& A) {
        lu_.analyzePattern(A);
        analyzed_ = true;
    }

    // Numeric factorization (called every time step for nonlinear circuits,
    // or only after topology change for linear circuits)
    void factorize(const SpMat& A) {
        if (!analyzed_) analyze(A);
        lu_.factorize(A);
        if (lu_.info() != Eigen::Success)
            throw std::runtime_error("LU factorization failed — singular or ill-conditioned matrix");
    }

    Vec solve(const Vec& b) const {
        Vec x = lu_.solve(b);
        if (lu_.info() != Eigen::Success)
            throw std::runtime_error("LU solve failed");
        return x;
    }
};
```

**Performance pattern for linear circuits:**
```
analyze_pattern(Y)  once at startup
factorize(Y)        once per topology change (switch event)
solve(J)            once per time step — cheapest operation
```

**Performance pattern for nonlinear circuits:**
```
analyze_pattern(Y)  once per topology change
factorize(Y)        once per NR iteration (Y changes each iteration)
solve(J)            once per NR iteration
```

---

## COLAMD vs. AMD Ordering

Ordering reduces fill-in during LU factorization (fill-in = new nonzeros created in L and U):

| Ordering | Description | Use when |
|---|---|---|
| COLAMD | Column Approximate Minimum Degree | Asymmetric matrices (typical MNA) |
| AMD | Approximate Minimum Degree | Symmetric matrices |
| Natural | No reordering | Debugging only |
| MMD | Multiple Minimum Degree | Alternative to AMD, sometimes better |

```cpp
// Switch ordering if COLAMD gives poor fill
Eigen::SparseLU<SpMat, Eigen::AMDOrdering<int>> lu_amd;     // for symmetric-ish
Eigen::SparseLU<SpMat, Eigen::NaturalOrdering<int>> lu_nat; // no reorder (debug)
```

---

## UMFPACK via Eigen

Requires SuiteSparse installed:

```cpp
#include <Eigen/UmfPackSupport>

Eigen::UmfPackLU<SpMat> solver;
solver.compute(Y);
if (solver.info() != Eigen::Success)
    throw std::runtime_error("UMFPACK failed");
Vec x = solver.solve(J);
```

**Install (Linux):** `apt install libsuitesparse-dev`
**CMake:** `find_package(SuiteSparse CONFIG)` or use vcpkg/conan.

---

## Factorization Reuse Strategy

Factorizing is O(nnz^1.5) — expensive. Solve (triangular substitution) is O(nnz). Reuse factors whenever possible:

```cpp
class MNATimeLoop {
    SparseLUSolver solver_;
    SpMat Y_current_;
    SwitchTopology prev_topology_;

public:
    void step(double t, double h) {
        assemble_Y(Y_current_, J_rhs_, h);

        // Only re-factorize if topology changed (switch event)
        if (topology_changed()) {
            solver_.analyze(Y_current_);   // symbolic: once per topology
            solver_.factorize(Y_current_); // numeric
        }
        // For nonlinear circuits, re-factorize every NR iteration:
        // solver_.factorize(Y_jacobian_);

        Vec x = solver_.solve(J_rhs_);
        update_state(x);
    }

    bool topology_changed() const {
        return current_topology_ != prev_topology_;
    }
};
```

---

## Condition Number and Ill-Conditioning

**Condition number κ(Y) = ||Y|| · ||Y⁻¹||** — if κ >> 1/machine_epsilon (~1e16 for double), solution has significant roundoff error.

```cpp
// Cheap condition number estimate via SVD (for small matrices)
#include <Eigen/Dense>
Eigen::JacobiSVD<Eigen::MatrixXd> svd(Y.toDense());
double cond = svd.singularValues()(0) /
              svd.singularValues()(svd.singularValues().size() - 1);
std::cout << "Condition number: " << cond << "\n";
// > 1e10 → warning, > 1e12 → likely numerical issues
```

**Common causes of ill-conditioning in MNA:**
- Very different component values (1 MΩ and 1 mΩ in the same circuit) → scale issues
- Near-floating node (tiny conductance to ground) → near-singular row
- Very large capacitor with small time step → G_eq = 2C/h >> all other conductances

**Scaling (diagonal preconditioning):**
```cpp
// Scale each row/column so diagonal is ~1
VectorXd D_inv(N);
for (int i = 0; i < N; ++i)
    D_inv(i) = 1.0 / std::sqrt(std::abs(Y.coeff(i,i)));
// Scale: Y' = D_inv * Y * D_inv, J' = D_inv * J
// Solve: Y' * (D * x) = J', then x = D * solution
```

---

## Profiling Solver Time

```cpp
#include <chrono>

auto t0 = std::chrono::high_resolution_clock::now();
solver_.factorize(Y);
auto t1 = std::chrono::high_resolution_clock::now();
solver_.solve(J);
auto t2 = std::chrono::high_resolution_clock::now();

double factorize_ms = std::chrono::duration<double, std::milli>(t1-t0).count();
double solve_ms     = std::chrono::duration<double, std::milli>(t2-t1).count();

// If factorize_ms >> solve_ms: minimize re-factorizations
// If both are slow: circuit too large → try KLU or parallel solver
```
