# Numerical Benchmarks and Regression Infrastructure

> Reference for: simulation-verification
> Load when: Building parameter sweeps, Monte Carlo studies, or automated regression test infrastructure

## Regression Test Infrastructure

### Test Runner Pattern (C++, Google Test)

```cpp
#include <gtest/gtest.h>
#include "simulator.h"
#include "golden_data.h"

// Golden dataset: pre-computed reference output stored in test/golden/
// Format: CSV with header "time,v_out,i_L"

class BuckConverterTest : public ::testing::Test {
protected:
    SimulatorConfig config_;
    void SetUp() override {
        config_.V_in  = 48.0;
        config_.f_sw  = 100e3;
        config_.L     = 100e-6;
        config_.C     = 100e-6;
        config_.R     = 1.2;
        config_.D     = 0.25;
        config_.t_end = 10e-3;
        config_.h     = 1e-8;  // 10ns time step
    }
};

TEST_F(BuckConverterTest, SteadyStateOutputVoltage) {
    Simulator sim(config_);
    sim.run();

    // Compare to analytical value
    double V_out_expected = config_.D * config_.V_in; // 12V
    double V_out_sim = sim.steady_state_v_out();

    EXPECT_NEAR(V_out_sim, V_out_expected,
                V_out_expected * 0.001); // 0.1% tolerance
}

TEST_F(BuckConverterTest, CurrentRipple) {
    Simulator sim(config_);
    sim.run();
    double delta_IL_expected = (config_.V_in - config_.D * config_.V_in)
                              * config_.D / (config_.L * config_.f_sw);
    EXPECT_NEAR(sim.inductor_current_ripple(), delta_IL_expected,
                delta_IL_expected * 0.05); // 5% tolerance
}

TEST_F(BuckConverterTest, GoldenDatasetRegression) {
    Simulator sim(config_);
    sim.run();

    auto golden = load_golden("test/golden/buck_ccm_standard.csv");
    auto result = compare_waveforms(sim.output(), golden);

    EXPECT_LT(result.rms_error_rel, 0.005);  // 0.5% RMS
    EXPECT_LT(result.peak_error_rel, 0.02);  // 2% peak
}
```

### Golden Dataset Management

```
test/
  golden/
    buck_ccm_standard.csv        -- V_in=48, D=0.25, steady state
    buck_dcm_light_load.csv      -- same topology, 0.1A load (DCM)
    boost_ccm.csv
    flyback_ccm.csv
    buck_load_step.csv           -- transient: 10A→5A step
  generate_golden.py             -- script to regenerate golden data from LTspice
  README.md                      -- tolerance definitions, regeneration instructions
```

**Regenerate golden data** (only when intentionally changing the reference):
```python
# generate_golden.py
# Run LTspice reference, export, store with git commit message explaining change

import subprocess, csv, hashlib

def run_ltspice(cir_file, output_file):
    subprocess.run(["LTspice64.exe", "-b", cir_file])
    # Parse .raw file → CSV

def hash_file(path):
    return hashlib.sha256(open(path,'rb').read()).hexdigest()[:12]

# Store hash in manifest so accidental regeneration is detected
```

---

## Parameter Sweep Infrastructure

### Single-Parameter Sweep

```cpp
struct SweepConfig {
    std::string param_name;
    double min_val, max_val;
    int N_points;
    bool log_scale;
};

void run_parameter_sweep(const SweepConfig& sweep) {
    std::ofstream csv("sweep_" + sweep.param_name + ".csv");
    csv << sweep.param_name << ",V_out,I_L_avg,efficiency,converged\n";

    for (int i = 0; i < sweep.N_points; ++i) {
        double t = static_cast<double>(i) / (sweep.N_points - 1);
        double val = sweep.log_scale
            ? sweep.min_val * std::pow(sweep.max_val/sweep.min_val, t)
            : sweep.min_val + t * (sweep.max_val - sweep.min_val);

        SimulatorConfig cfg = base_config();
        set_param(cfg, sweep.param_name, val);

        Simulator sim(cfg);
        auto result = sim.run();

        csv << val << ","
            << result.V_out << ","
            << result.I_L_avg << ","
            << result.efficiency << ","
            << (result.converged ? 1 : 0) << "\n";
    }
}

// Usage:
// run_parameter_sweep({"D", 0.1, 0.9, 50, false});    -- duty cycle sweep
// run_parameter_sweep({"R", 0.1, 100, 30, true});      -- load sweep (log)
// run_parameter_sweep({"f_sw", 10e3, 1e6, 20, true});  -- frequency sweep
```

---

## Monte Carlo Analysis

**Purpose:** Verify the simulator handles component tolerances without diverging, and characterize output distribution.

```cpp
#include <random>

struct MonteCarloConfig {
    int N_runs = 500;
    double L_tol = 0.1;    // ±10% inductor tolerance
    double C_tol = 0.2;    // ±20% capacitor tolerance
    double R_tol = 0.01;   // ±1% resistor tolerance
    unsigned seed = 42;    // fixed seed for reproducibility
};

void run_monte_carlo(const SimulatorConfig& nominal, const MonteCarloConfig& mc) {
    std::mt19937 rng(mc.seed);
    std::normal_distribution<double> dist(0.0, 1.0/3.0); // 3σ = ±tolerance

    std::vector<double> V_out_results, efficiency_results;
    int n_converged = 0;

    for (int run = 0; run < mc.N_runs; ++run) {
        SimulatorConfig cfg = nominal;
        cfg.L *= (1.0 + mc.L_tol * dist(rng));
        cfg.C *= (1.0 + mc.C_tol * dist(rng));
        cfg.R *= (1.0 + mc.R_tol * dist(rng));

        Simulator sim(cfg);
        auto result = sim.run();

        if (result.converged) {
            ++n_converged;
            V_out_results.push_back(result.V_out);
            efficiency_results.push_back(result.efficiency);
        }
    }

    // Report statistics
    double V_mean  = mean(V_out_results);
    double V_sigma = std_dev(V_out_results);
    double conv_rate = 100.0 * n_converged / mc.N_runs;

    std::cout << "Monte Carlo Results (" << mc.N_runs << " runs):\n"
              << "  Convergence rate: " << conv_rate << "%\n"
              << "  V_out: " << V_mean << " ± " << V_sigma << " V\n"
              << "  V_out 3σ range: ["
              << V_mean - 3*V_sigma << ", " << V_mean + 3*V_sigma << "] V\n";
}
```

**Expected results:**
- Convergence rate > 99% (failure indicates instability near boundary conditions)
- Output distribution: approximately Gaussian for linear circuits, skewed for nonlinear

---

## Performance Benchmarks

Track simulation speed to catch performance regressions:

```cpp
#include <chrono>

struct PerfResult {
    double wall_time_ms;
    double sim_time_simulated;
    double speedup_ratio;  // simulated time / wall time
    int N_steps;
    int N_NR_total;        // total Newton-Raphson iterations
    int N_refactorizations;
};

PerfResult benchmark_performance(const SimulatorConfig& cfg) {
    auto t0 = std::chrono::high_resolution_clock::now();

    Simulator sim(cfg);
    sim.enable_profiling(true);
    sim.run();

    auto t1 = std::chrono::high_resolution_clock::now();
    double wall_ms = std::chrono::duration<double, std::milli>(t1-t0).count();

    PerfResult r;
    r.wall_time_ms       = wall_ms;
    r.sim_time_simulated = cfg.t_end;
    r.speedup_ratio      = cfg.t_end / (wall_ms * 1e-3);
    r.N_steps            = sim.step_count();
    r.N_NR_total         = sim.nr_iteration_count();
    r.N_refactorizations = sim.refactorization_count();
    return r;
}

// Target performance (tune per machine):
// - Simple buck (1000 nodes, 10ms sim): < 100ms wall time → 100× realtime
// - Complex converter (100+ nodes): > 10× realtime
// - NR iterations per step: average < 5 (high NR count → bad initial guess or tight tolerance)
```

---

## CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/simulation-tests.yml
name: Simulation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get install -y cmake libgtest-dev libeigen3-dev

      - name: Build
        run: |
          cmake -B build -DCMAKE_BUILD_TYPE=Release
          cmake --build build -j4

      - name: Run unit tests
        run: ./build/tests/unit_tests --gtest_output=xml:test_results.xml

      - name: Run benchmark regression
        run: ./build/tests/benchmark_regression --tolerance 0.005

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test_results.xml
```
