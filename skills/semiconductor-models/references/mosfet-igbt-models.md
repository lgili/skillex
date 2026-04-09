# MOSFET and IGBT Models

> Reference for: semiconductor-models
> Load when: Reviewing switch model accuracy, analyzing switching waveforms, or extracting C_oss/gate charge

## MOSFET Regions of Operation

| Region | Condition | Model |
|---|---|---|
| Off | V_GS < V_th | Open circuit (or R_off >> 1 GΩ) |
| Ohmic/Linear | V_GS > V_th, V_DS < V_GS − V_th | Resistor: Rds_on (= V_DS/I_D) |
| Saturation/Active | V_GS > V_th, V_DS ≥ V_GS − V_th | Current source (not needed for switch-mode) |
| Body diode | V_DS < 0 | Forward-biased body PN junction |

For power converter simulation in switch-mode, only **OFF** and **Ohmic** states are needed for the switch itself. The body diode is modeled separately.

---

## Conduction Model (ON-state)

```
I_D = V_DS / Rds_on(T_j, I_D)

Temperature dependence (first-order model):
  Rds_on(T_j) = Rds_on_25 · (T_j / 300)^2.3    [silicon MOSFET]
  Rds_on(T_j) = Rds_on_25 · (T_j / 300)^2.0    [silicon carbide SiC MOSFET]

T_j in Kelvin, Rds_on_25 from datasheet at 25°C, max I_D.
```

**Current dependence:** Rds_on is roughly constant in ohmic region for well-designed MOSFETs — use datasheet value at rated current. At very low currents, slight increase may occur.

---

## Gate Charge Model

Gate charge parameters control switching speed:

```
Q_g   = total gate charge (gate drive energy = V_GS * Q_g)
Q_gs  = gate-to-source charge (threshold + Miller plateau)
Q_gd  = Miller charge (dominant, controls dV_DS/dt rate)
Q_sw  = switching charge = Q_gs2 + Q_gd   (from V_th to V_plateau)

Switching time approximation:
  t_on  ≈ Q_sw / I_gate_source
  t_off ≈ Q_sw / I_gate_sink

  I_gate = (V_drive − V_plateau) / R_gate   (during Miller plateau)
  V_plateau ≈ V_th + I_D / g_fs             (transconductance g_fs from datasheet)
```

---

## Output Capacitance C_oss

C_oss is strongly nonlinear — drops from ~nF at low V_DS to ~pF at rated voltage:

```
C_oss(V_DS) = C_oss_1V · (1V / V_DS)^0.5    [approximation for depletion capacitance]

Energy stored:
  E_oss(V) = ∫₀^V C_oss(v) dv ≈ 2·C_oss_1V·sqrt(V)   [in joules]

ZVS condition (for LLC or phase-shift full-bridge):
  ½·L·I_sw² ≥ E_oss(V_bus)    [inductor must fully discharge C_oss]
```

**Datasheet C_oss:** Given at a specific V_DS (e.g., 480V for 650V device). Use the curve, not just one point.

```cpp
// Lookup table for C_oss vs V_DS
double C_oss(double v_ds) {
    if (v_ds <= 0) return c_oss_max_;
    return c_oss_1v_ / std::sqrt(v_ds);  // or use interpolation from table
}

double E_oss(double v_bus) {
    // Numerically integrate C_oss * dv from 0 to v_bus
    double sum = 0.0;
    double dv  = v_bus / 1000.0;
    for (double v = dv/2; v < v_bus; v += dv)
        sum += C_oss(v) * dv;
    return 0.5 * sum; // ½ factor already in integral: E = ∫C·dv
}
```

---

## Switching Loss Model

Hard-switched turn-on (inductive load):

```
Turn-on: current rises at dI/dt = (V_drive - V_plateau) / (R_gate * L_gate_loop)
         during t_ri (current rise time) → cross-conduction with diode
         voltage falls during t_fu (voltage fall time)

Switching energy from datasheet (at V_test, I_test, R_gate_test):
  E_on(I_D, V_bus, R_gate) ≈ E_on_datasheet · (I_D/I_test) · (V_bus/V_test) · (R_gate/R_gate_test)^0.6
  E_off(I_D, V_bus, R_gate) ≈ E_off_datasheet · (I_D/I_test) · (V_bus/V_test)

Power loss:
  P_sw = (E_on + E_off) · f_sw

Soft-switched (ZVS turn-on):
  E_on ≈ 0  (voltage is zero before switch turns on)
  Still have E_off losses from current tail (especially IGBT)
```

---

## IGBT vs MOSFET — Key Differences

| Parameter | MOSFET | IGBT |
|---|---|---|
| Conduction drop | Rds_on (resistive, low at low V) | V_CE_sat + R_on (bipolar, ~1–2 V fixed drop) |
| Turn-off mechanism | Unipolar, fast | Minority carrier tail — slower turn-off, current tail |
| Turn-off loss | Low for fast FETs | Higher due to tail current |
| Temperature behavior | Rds_on increases with T (positive temp coeff) | V_CE_sat slight decrease with T (negative, paralleling risk) |
| Frequency | Better above 100 kHz | Better below 50 kHz (slower but lower V_CE_sat at high current) |

**IGBT tail current model:**
```
After main current falls, minority carriers recombine exponentially:
  I_tail(t) = I_tail_0 · exp(−t / τ_tail)

  I_tail_0 ≈ 0.1 · I_on (rule of thumb, varies widely)
  τ_tail    ≈ 0.1–1 µs (from turn-off waveform)

Tail current loss:
  E_tail ≈ ½ · I_tail_0 · V_CE_sat · τ_tail
```

---

## C++ Switch Model Interface

Minimum interface expected by the MNA solver:

```cpp
class SwitchModel {
public:
    enum class State { OFF, ON, BODY_DIODE };

    virtual void set_state(State s) = 0;
    virtual State get_state() const = 0;

    // MNA stamp contributions
    virtual void stamp_conductance(MNAMatrix& Y, int node_d, int node_s) const = 0;
    virtual void stamp_current_source(MNAVector& I, int node_d, int node_s) const = 0;

    // Switching energy (for loss accounting, not for MNA)
    virtual double turn_on_energy(double v_off, double i_on) const = 0;
    virtual double turn_off_energy(double v_on, double i_off) const = 0;
};

class MOSFETModel : public SwitchModel {
    double rds_on_25_; // Ohms at 25°C
    double t_junction_; // °C, updated each time step
    double c_oss_1v_;   // C_oss coefficient
    BodyDiodeModel body_diode_;

    void stamp_conductance(MNAMatrix& Y, int d, int s) const override {
        double G = (state_ == State::ON) ? 1.0 / rds_on() : G_off_;
        Y(d,d) += G; Y(d,s) -= G;
        Y(s,d) -= G; Y(s,s) += G;
    }

    double rds_on() const {
        double T_K = t_junction_ + 273.15;
        return rds_on_25_ * std::pow(T_K / 298.15, 2.3);
    }
};
```
