# Sparse Matrix Assembly

> Reference for: circuit-solver
> Load when: Building C++ data structures for MNA matrix assembly and factorization

## Storage Formats

### Triplet / COO (Coordinate) Format

Best for incremental assembly — each stamp appends (row, col, value) tuples:

```cpp
struct Triplet {
    int row, col;
    double value;
};

class MNAMatrix {
    int size_;
    std::vector<Triplet> entries_;

public:
    void add(int row, int col, double val) {
        if (row == 0 || col == 0) return; // skip ground
        entries_.push_back({row - 1, col - 1, val});
    }

    void reset() { entries_.clear(); }

    // Convert to CSR for solver
    Eigen::SparseMatrix<double> to_sparse() const {
        Eigen::SparseMatrix<double> mat(size_, size_);
        std::vector<Eigen::Triplet<double>> eigen_triplets;
        eigen_triplets.reserve(entries_.size());
        for (auto& e : entries_)
            eigen_triplets.emplace_back(e.row, e.col, e.value);
        mat.setFromTriplets(eigen_triplets.begin(), eigen_triplets.end());
        return mat;
    }
};
```

### CSR (Compressed Sparse Row) Format

Efficient for LU factorization:

```
row_ptr[i]     = index into col_idx/values where row i begins
row_ptr[N]     = total number of nonzeros
col_idx[k]     = column index of k-th nonzero
values[k]      = value of k-th nonzero
```

### CSC (Compressed Sparse Column) Format

Preferred by column-oriented solvers (SuperLU, UMFPACK):

```
col_ptr[j]     = index into row_idx/values where column j begins
col_ptr[N]     = total number of nonzeros
row_idx[k]     = row index of k-th nonzero
values[k]      = value of k-th nonzero
```

---

## Eigen Sparse Matrix Usage

```cpp
#include <Eigen/Sparse>
#include <Eigen/SparseLU>

using SpMat = Eigen::SparseMatrix<double>;  // default: column-major (CSC)
using Vec   = Eigen::VectorXd;

// Assembly
SpMat build_Y(int N, const std::vector<Component*>& components) {
    std::vector<Eigen::Triplet<double>> triplets;
    triplets.reserve(N * 4); // rough estimate

    MNAMatrix Y(N);
    Vec J = Vec::Zero(N);

    for (auto* c : components)
        c->stamp(Y, J);

    SpMat mat(N, N);
    mat.setFromTriplets(triplets.begin(), triplets.end());
    mat.makeCompressed();
    return mat;
}

// Factorization and solve
class MNASolver {
    Eigen::SparseLU<SpMat, Eigen::COLAMDOrdering<int>> solver_;
    bool factored_ = false;

public:
    void factorize(const SpMat& Y) {
        solver_.analyzePattern(Y);
        solver_.factorize(Y);
        if (solver_.info() != Eigen::Success)
            throw std::runtime_error("MNA factorization failed: singular matrix");
        factored_ = true;
    }

    Vec solve(const Vec& J) {
        if (!factored_) throw std::logic_error("Not factored");
        Vec x = solver_.solve(J);
        if (solver_.info() != Eigen::Success)
            throw std::runtime_error("MNA solve failed");
        return x;
    }
};
```

---

## Incremental Update Strategy

When only a few elements change (e.g., one switch toggles), avoid full re-assembly:

```cpp
// Mark dirty entries and only update those
class IncrementalMNAMatrix {
    SpMat Y_base_;       // stamps that never change (resistors, fixed sources)
    SpMat Y_variable_;   // stamps that may change (switches, nonlinear elements)

public:
    void rebuild_variable(const std::vector<SwitchModel*>& switches) {
        std::vector<Eigen::Triplet<double>> trips;
        for (auto* sw : switches)
            sw->stamp_triplets(trips);  // only active-switch stamps
        Y_variable_.setFromTriplets(trips.begin(), trips.end());
    }

    SpMat assembled() const {
        return Y_base_ + Y_variable_;  // Eigen supports sparse addition
    }
};
```

---

## Node Reordering for Bandwidth Reduction

Fill-in during LU factorization depends on node ordering. Use AMD (Approximate Minimum Degree) or COLAMD:

```cpp
// Eigen's SparseLU uses COLAMDOrdering by default
Eigen::SparseLU<SpMat, Eigen::COLAMDOrdering<int>> solver;

// Alternatively: NaturalOrdering (no reorder, useful for debugging)
Eigen::SparseLU<SpMat, Eigen::NaturalOrdering<int>> solver_natural;
```

**Manual bandwidth reduction (Cuthill-McKee):**
- Build adjacency graph from Y nonzero pattern.
- Apply reverse Cuthill-McKee (RCM) ordering.
- Available in Eigen: `Eigen::AMDOrdering`, or use external: `SuiteSparse/AMD`.

---

## Pattern Analysis (Sparsity)

```cpp
void print_sparsity(const SpMat& Y) {
    std::cout << "Size: " << Y.rows() << "×" << Y.cols() << "\n";
    std::cout << "Nonzeros: " << Y.nonZeros() << "\n";
    std::cout << "Fill: " << 100.0 * Y.nonZeros() / (Y.rows() * Y.cols()) << " %\n";

    // Check diagonal dominance (positive = good conditioning)
    for (int i = 0; i < Y.rows(); ++i) {
        double diag = Y.coeff(i, i);
        double off  = 0.0;
        for (SpMat::InnerIterator it(Y, i); it; ++it)
            if (it.row() != i) off += std::abs(it.value());
        if (diag <= 0 || diag < off)
            std::cerr << "Warning: row " << i << " not diagonally dominant\n";
    }
}
```

---

## RHS Vector Management

```cpp
// Efficient RHS: reuse the same Vec, just reset values each step
class RHSVector {
    Eigen::VectorXd J_;
    int N_;

public:
    explicit RHSVector(int N) : J_(N), N_(N) {}

    void reset() { J_.setZero(); }

    void add(int node, double val) {
        if (node == 0) return;
        J_(node - 1) += val;
    }

    const Eigen::VectorXd& vec() const { return J_; }
};
```

---

## Debugging Checklist

When solver returns NaN, infinity, or wildly wrong values:

1. **Print Y matrix** — check for zero rows (floating node), near-zero diagonal, or wrong signs.
2. **Check connectivity** — every node must have a path to ground. Build adjacency graph and BFS.
3. **Verify symmetry** — for passive networks: `(Y − Y.transpose()).norm()` should be ~machine epsilon.
4. **Check condition number** — `Eigen::JacobiSVD` gives singular values; ratio max/min = condition number. >1e12 = ill-conditioned.
5. **Reduce to smallest failing case** — remove elements one by one until the singularity disappears.
6. **Check switch state** — if a switch just toggled, verify re-stamp happened and old entries were cleared.
