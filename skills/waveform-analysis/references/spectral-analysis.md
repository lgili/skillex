# Spectral Analysis

> Reference for: waveform-analysis
> Load when: Setting up FFT, windowing, identifying harmonics, or interpreting switching waveform spectra

## DFT / FFT Fundamentals

**Discrete Fourier Transform:**
```
X[k] = sum_{n=0}^{N-1} x[n] · exp(-j·2π·k·n/N)

k = 0, 1, ..., N-1     (frequency bin index)
n = 0, 1, ..., N-1     (time sample index)

Frequency resolution:  Δf = f_sample / N = 1 / (N · T_s)
Frequency of bin k:    f_k = k · Δf
Nyquist frequency:     f_Nyquist = f_sample / 2   (bin N/2)
```

**Magnitude spectrum:**
```
|X[k]| = sqrt(Re(X[k])² + Im(X[k])²)

Single-sided amplitude:
  A[k] = 2 · |X[k]| / N    for k = 1, 2, ..., N/2-1
  A[0] = |X[0]| / N        (DC component)
  A[N/2] = |X[N/2]| / N    (Nyquist bin)
```

**Phase spectrum:**
```
φ[k] = atan2(Im(X[k]), Re(X[k]))
```

---

## Spectral Leakage

Leakage occurs when the signal period is not an exact multiple of the sampling window:

```
Ideal case (integer periods): Energy at f_k appears in exactly one bin
Leakage case: Energy spreads to neighboring bins → distorted spectrum

Leakage ratio: L = 20·log|sinc(f_exact - f_bin)·N| [dB]
For ±0.5 bin offset: ~-13 dB sidelobe (rectangular window)
```

**Mitigation:**
1. Capture exactly N_periods complete periods → f_fundamental = f_sample/N × N_periods
2. If not exact, apply a window function

---

## Window Functions

| Window | Main lobe width | Peak sidelobe | When to use |
|---|---|---|---|
| Rectangular | Narrow (1 bin) | −13 dB | Only if exactly integer periods |
| Hann | 2 bins | −31 dB | General purpose |
| Blackman | 3 bins | −57 dB | When sidelobe rejection critical |
| Flat-top | 4 bins | −93 dB | Accurate amplitude measurement |
| Kaiser (β=8) | ~3 bins | −80 dB | Tunable sidelobe/width tradeoff |

**Hann window:**
```cpp
std::vector<double> hann_window(int N) {
    std::vector<double> w(N);
    for (int i = 0; i < N; ++i)
        w[i] = 0.5 * (1.0 - std::cos(2.0 * M_PI * i / (N - 1)));
    return w;
}
```

**Applying window before FFT:**
```cpp
void apply_window(std::vector<double>& x, const std::vector<double>& w) {
    for (size_t i = 0; i < x.size(); ++i)
        x[i] *= w[i];
}

// Amplitude correction factor (to compensate for window energy loss):
double window_amplitude_correction(const std::vector<double>& w) {
    double sum = 0.0;
    for (auto v : w) sum += v;
    return w.size() / sum;  // multiply amplitudes by this factor
}
```

---

## FFT Implementation (C++)

Using standard library or a simple Cooley-Tukey implementation:

```cpp
#include <complex>
#include <vector>
#include <cmath>

// Cooley-Tukey radix-2 DIT FFT (N must be power of 2)
void fft(std::vector<std::complex<double>>& a, bool inverse = false) {
    int N = a.size();
    if (N <= 1) return;

    // Bit-reversal permutation
    for (int i = 1, j = 0; i < N; ++i) {
        int bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) std::swap(a[i], a[j]);
    }

    // FFT butterfly
    for (int len = 2; len <= N; len <<= 1) {
        double angle = 2.0 * M_PI / len * (inverse ? -1.0 : 1.0);
        std::complex<double> wlen(std::cos(angle), std::sin(angle));
        for (int i = 0; i < N; i += len) {
            std::complex<double> w(1.0, 0.0);
            for (int j = 0; j < len/2; ++j) {
                auto u = a[i+j], v = a[i+j+len/2] * w;
                a[i+j]        = u + v;
                a[i+j+len/2]  = u - v;
                w *= wlen;
            }
        }
    }
    if (inverse) for (auto& x : a) x /= N;
}

// Compute amplitude spectrum
struct HarmonicComponent {
    double frequency;
    double amplitude;  // peak (physical units)
    double phase;      // radians
};

std::vector<HarmonicComponent> compute_spectrum(
        const std::vector<double>& signal,
        double f_sample,
        bool apply_hann = true) {

    int N = signal.size();
    std::vector<std::complex<double>> X(signal.begin(), signal.end());

    if (apply_hann) {
        auto w = hann_window(N);
        double corr = window_amplitude_correction(w);
        for (int i = 0; i < N; ++i) X[i] *= w[i] * corr;
    }

    fft(X);

    std::vector<HarmonicComponent> spectrum;
    double df = f_sample / N;
    for (int k = 1; k <= N/2; ++k) {
        double amp = 2.0 * std::abs(X[k]) / N;
        spectrum.push_back({k * df, amp, std::arg(X[k])});
    }
    return spectrum;
}
```

---

## Harmonic Identification for Power Electronics

**DC-DC converter ripple spectrum:**
```
Fundamental: f_sw (switching frequency ripple)
Harmonics:   2·f_sw, 3·f_sw, ... (odd/even depends on topology)

Buck: odd and even harmonics (full-wave ripple)
Boost: fundamental and odd harmonics dominant
```

**DC-AC inverter output spectrum (SPWM):**
```
Desired: f_0 (fundamental, e.g., 50/60 Hz)
SPWM sidebands: f_sw ± 2·f_0, 2·f_sw ± f_0, 3·f_sw ± 2·f_0, ...
Low-order harmonics: 3rd, 5th, 7th (3-phase: 5th, 7th, 11th, 13th due to cancellation)
```

**Finding the fundamental in an unknown waveform:**
```cpp
int find_fundamental_bin(const std::vector<HarmonicComponent>& spectrum) {
    // Fundamental = bin with largest magnitude (for a simple sinusoidal output)
    // For DC-DC: largest ripple bin = f_sw
    // For inverter: search near expected grid frequency
    int max_bin = 1;
    for (size_t k = 1; k < spectrum.size(); ++k)
        if (spectrum[k].amplitude > spectrum[max_bin].amplitude) max_bin = k;
    return max_bin;
}
```

---

## Extracting Ripple from Switching Waveform

```cpp
// Separate DC and AC components
double compute_dc(const std::vector<double>& v) {
    return std::accumulate(v.begin(), v.end(), 0.0) / v.size();
}

double compute_rms(const std::vector<double>& v) {
    double sum_sq = 0.0;
    for (auto x : v) sum_sq += x * x;
    return std::sqrt(sum_sq / v.size());
}

double compute_ac_rms(const std::vector<double>& v) {
    double dc  = compute_dc(v);
    double rms = compute_rms(v);
    return std::sqrt(rms*rms - dc*dc);
}

// Peak-to-peak ripple (actual switching ripple)
double compute_ripple_pp(const std::vector<double>& v) {
    auto [mn, mx] = std::minmax_element(v.begin(), v.end());
    return *mx - *mn;
}
```
