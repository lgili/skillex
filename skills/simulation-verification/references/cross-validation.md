# Cross-Validation Against PSIM and SPICE

> Reference for: simulation-verification
> Load when: Comparing simulator output to PSIM/SPICE references, error metrics, or interpreting discrepancies

## Reference Tool Setup

### LTspice (Free, Industry Standard)

**Settings for high-accuracy reference:**
```
.tran analysis:
  timestep = T_sw / 10000    (10× finer than your simulator's finest step)
  stop_time = 10 · max(τ, T_sw)   (enough for steady state)

Solver settings (right-click on .tran):
  Maximum timestep: T_sw / 10000
  SPICE error tolerance: 1e-6  (not the default 1e-3)

Waveform export: right-click plot → "Export" → CSV
```

**LTspice MOSFET model:** Use SPICE Level 3 or BSim3v3 models from device manufacturer, not the built-in NMOS/PMOS.

**Example .cir for buck converter:**
```spice
* Buck Converter Reference
.tran 1n 5m 4m uic   ; 1ns step, 5ms total, start saving from 4ms

V1 vin 0 48V
SW vin lx 0 ctrl IDEAL_SW
D1 0 lx IDEAL_D
L1 lx vout 100u
C1 vout 0 100u
R1 vout 0 1.2

* Ideal switch model
.model IDEAL_SW SW(Ron=1m Roff=1G Vt=0.5 Vh=0.01)
* Ideal diode
.model IDEAL_D D(Ron=0.001 Roff=1G Vfwd=0)

* PWM source (25% duty cycle at 100kHz)
Vpwm ctrl 0 PULSE(0 1 0 1n 1n 2.5u 10u)

.probe V(vout) I(L1) V(lx)
.end
```

---

### ngspice (Open Source, Scriptable)

```spice
* Run from command line: ngspice -b -o output.csv buck.cir

.control
run
wrdata output.csv V(vout) I(L1) time
.endc
```

**Batch processing for parameter sweeps:**
```bash
for D in 0.20 0.25 0.30 0.35 0.40; do
    sed "s/DUTY_CYCLE/$D/" buck_template.cir > buck_${D}.cir
    ngspice -b -o ref_D${D}.csv buck_${D}.cir
done
```

---

### PSIM (Commercial, Power Electronics Specialized)

PSIM uses a unique time-domain solver (fixed-step, resistive companion) — closest to what the custom simulator implements.

**Export waveforms:** Simview → File → Export → .txt (time, V, I columns)

**PSIM reference settings:**
- Time step: T_sw / 1000 minimum for reference
- Print step: T_sw / 100 (reduce data volume)
- Total time: enough for steady state (≥ 100 switching periods)

---

## Error Metrics

### Point-by-Point Comparison

Interpolate reference to simulator's time grid (or vice versa) before computing errors:

```cpp
// Linear interpolation to align time grids
double interpolate(const std::vector<double>& t_ref,
                   const std::vector<double>& v_ref,
                   double t_query) {
    auto it = std::lower_bound(t_ref.begin(), t_ref.end(), t_query);
    if (it == t_ref.end()) return v_ref.back();
    if (it == t_ref.begin()) return v_ref.front();
    int idx = std::distance(t_ref.begin(), it);
    double t0 = t_ref[idx-1], t1 = t_ref[idx];
    double v0 = v_ref[idx-1], v1 = v_ref[idx];
    return v0 + (v1 - v0) * (t_query - t0) / (t1 - t0);
}
```

### Error Metric Definitions

```cpp
struct ValidationResult {
    double peak_error_abs;   // max |v_sim - v_ref|
    double peak_error_rel;   // peak_error_abs / max(|v_ref|, eps)
    double rms_error_abs;    // sqrt(mean((v_sim - v_ref)²))
    double rms_error_rel;    // rms_error_abs / rms(v_ref)
    double dc_error_abs;     // |mean(v_sim) - mean(v_ref)|
    double dc_error_rel;     // dc_error_abs / |mean(v_ref)|
};

ValidationResult compare_waveforms(
        const std::vector<double>& t_sim, const std::vector<double>& v_sim,
        const std::vector<double>& t_ref, const std::vector<double>& v_ref) {

    // Only compare over steady-state window (skip transient)
    ValidationResult r{};
    double sum_sq_err = 0.0, max_err = 0.0;
    double v_ref_max = *std::max_element(v_ref.begin(), v_ref.end());

    for (size_t i = 0; i < t_sim.size(); ++i) {
        double v_r = interpolate(t_ref, v_ref, t_sim[i]);
        double err = std::abs(v_sim[i] - v_r);
        max_err = std::max(max_err, err);
        sum_sq_err += err * err;
    }

    r.peak_error_abs = max_err;
    r.peak_error_rel = max_err / std::max(v_ref_max, 1e-12);
    r.rms_error_abs  = std::sqrt(sum_sq_err / t_sim.size());
    r.rms_error_rel  = r.rms_error_abs / compute_rms(v_ref);
    r.dc_error_abs   = std::abs(compute_mean(v_sim) - compute_mean(v_ref));
    r.dc_error_rel   = r.dc_error_abs / std::max(std::abs(compute_mean(v_ref)), 1e-12);
    return r;
}
```

---

## Tolerance Table (Default Pass Criteria)

| Signal | DC error | RMS error | Peak error | Notes |
|---|---|---|---|---|
| Output voltage | 0.1% | 0.5% | 2% | Tight: affects efficiency calculation |
| Inductor current | 0.2% | 1% | 5% | Ripple adds peak error |
| Switch current | 1% | 2% | 10% | High dI/dt makes peak comparison hard |
| Power loss | 2% | 5% | 10% | Accumulates from all component errors |
| Frequency (FFT) | N/A | N/A | 0.1 bin | Should be exact at given step size |

---

## Interpreting Discrepancies

| Observation | Likely cause | Investigation |
|---|---|---|
| DC offset different | Different initial conditions | Extend simulation time or use DC OP from reference |
| Phase shift in transient | Different solver (explicit vs. implicit) | Check time step ratio, or compare after adding phase correction |
| Peak current different | Leakage inductance in reference but not in model | Add L_lk to custom simulator model |
| Switching ripple smaller | Reference has larger equivalent series resistance | Check R_on, DCR values in both simulators |
| Steady-state oscillation | Different Rds_on or numerical damping | Compare component values; check trapezoidal vs BE |
| Energy not conserved | Integration error or wrong stamp sign | Check volt-second balance, energy in − energy out |
