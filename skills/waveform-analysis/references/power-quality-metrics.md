# Power Quality Metrics

> Reference for: waveform-analysis
> Load when: Computing THD, power factor, DPF, crest factor, or checking against harmonic standards

## RMS and Average

```
True RMS:
  V_rms = sqrt(1/T · ∫₀^T v(t)² dt)
  Discrete: V_rms = sqrt(1/N · sum(v[n]²))

Average (DC component):
  V_dc = 1/T · ∫₀^T v(t) dt
  Discrete: V_dc = 1/N · sum(v[n])

AC RMS (ripple component):
  V_ac = sqrt(V_rms² − V_dc²)

Peak: V_pk = max(|v|)
Crest factor: CF = V_pk / V_rms   (sine: √2 ≈ 1.414, ideal square wave: 1.0)
```

```cpp
struct WaveformMetrics {
    double rms, dc, ac_rms, peak, crest_factor;
};

WaveformMetrics compute_metrics(const std::vector<double>& v) {
    int N = v.size();
    double sum = 0.0, sum_sq = 0.0, peak = 0.0;
    for (double x : v) {
        sum    += x;
        sum_sq += x * x;
        peak    = std::max(peak, std::abs(x));
    }
    double dc  = sum / N;
    double rms = std::sqrt(sum_sq / N);
    double ac  = std::sqrt(rms*rms - dc*dc);
    return {rms, dc, ac, peak, peak/rms};
}
```

---

## Harmonic Decomposition (RMS)

Each harmonic contributes independently to total RMS:
```
V_rms² = V_dc² + V_1_rms² + V_2_rms² + V_3_rms² + ...
       = V_dc² + sum_{k=1}^{∞} (V_k/√2)²     (V_k = peak amplitude of harmonic k)
```

---

## Total Harmonic Distortion (THD)

**THD-F (relative to fundamental) — IEEE/IEC standard:**
```
THD_F = sqrt(sum_{k=2}^{∞} V_k²) / V_1 × 100%

V_k = RMS amplitude of k-th harmonic
V_1 = RMS amplitude of fundamental

Note: THD_F > 100% is possible for very distorted signals
```

**THD-R (relative to RMS total):**
```
THD_R = sqrt(sum_{k=2}^{∞} V_k²) / V_rms × 100%

Note: THD_R ≤ 100% always
```

```cpp
double compute_THD_F(const std::vector<HarmonicComponent>& spectrum, int fundamental_bin) {
    double V1_sq  = spectrum[fundamental_bin].amplitude * spectrum[fundamental_bin].amplitude;
    double harm_sq = 0.0;
    for (size_t k = 0; k < spectrum.size(); ++k) {
        if ((int)k == fundamental_bin) continue;
        harm_sq += spectrum[k].amplitude * spectrum[k].amplitude;
    }
    return std::sqrt(harm_sq / V1_sq) * 100.0; // percentage
}
```

---

## Power Factor

**Apparent power, real power, reactive power:**
```
S = V_rms · I_rms             [VA]
P = 1/T · ∫ v(t)·i(t) dt     [W]  (real power)
Q = sqrt(S² − P²)            [VAR] (reactive power for sinusoidal)
PF = P / S   (power factor = cos(φ) for pure sinusoidal)
```

**For non-sinusoidal waveforms (distorted currents):**
```
PF = DPF · DF

DPF = cos(φ₁) = displacement power factor (phase between V₁ and I₁)
DF  = I₁_rms / I_rms = 1/sqrt(1 + THD_I²) = distortion factor

Combined: PF = cos(φ₁) / sqrt(1 + THD_I²)

THD_I is the main cause of poor PF in rectifier and converter loads.
```

```cpp
double compute_power_factor(const std::vector<double>& v,
                            const std::vector<double>& i) {
    int N = std::min(v.size(), i.size());
    double P = 0.0;
    for (int k = 0; k < N; ++k)
        P += v[k] * i[k];
    P /= N;

    double S = compute_metrics(v).rms * compute_metrics(i).rms;
    return (S > 0) ? P / S : 0.0;
}
```

---

## Displacement Power Factor (DPF)

Phase angle between fundamental voltage and fundamental current:

```
DPF = cos(φ₁) = cos(φ_V1 - φ_I1)

From FFT:
  φ_V1 = phase of fundamental voltage harmonic
  φ_I1 = phase of fundamental current harmonic
  φ₁   = φ_V1 - φ_I1
```

---

## Converter-Specific Metrics

### Output Voltage Ripple

```
V_ripple_pp = V_max - V_min   (peak-to-peak, over one switching cycle)
V_ripple_rms = V_ac_rms       (AC RMS component)
Ripple factor = V_ripple_pp / V_dc × 100%

Buck converter design target: V_ripple_pp < 1% of V_out
```

### Inductor Current Ripple

```
ΔI_L = I_pk - I_valley   (peak-to-peak current ripple)
ΔI_L / I_avg × 100% = current ripple ratio
Target: 20–40% for CCM (allows margin from DCM boundary)
```

### Input Current Harmonics

For AC/DC converters, input current harmonics must meet regulatory limits:

| Standard | Application | 3rd harmonic | THD limit |
|---|---|---|---|
| IEC 61000-3-2 Class A | Professional equipment | < 2.3 A | Varies by harmonic |
| IEC 61000-3-2 Class D | PC power supplies | 3.4 mA/W | See per-harmonic table |
| IEEE 519-2022 | Industrial | < 5% at PCC | See Table 2 |

---

## Efficiency Computation

```
η = P_out / P_in × 100%

P_in  = V_in_avg × I_in_avg  (for DC input)
P_out = V_out_avg × I_out_avg

For AC input:
P_in = 1/T · ∫ v_in(t) · i_in(t) dt   (real power)
```

```cpp
double compute_efficiency(const std::vector<double>& v_in,
                          const std::vector<double>& i_in,
                          const std::vector<double>& v_out,
                          const std::vector<double>& i_out) {
    auto P_in  = compute_average_power(v_in,  i_in);
    auto P_out = compute_average_power(v_out, i_out);
    return (P_in > 0) ? (P_out / P_in) * 100.0 : 0.0;
}

double compute_average_power(const std::vector<double>& v,
                             const std::vector<double>& i) {
    int N = std::min(v.size(), i.size());
    double P = 0.0;
    for (int k = 0; k < N; ++k) P += v[k] * i[k];
    return P / N;
}
```
