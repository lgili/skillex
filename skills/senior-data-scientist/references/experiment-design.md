# Experiment and A/B Test Design

## When to Use A/B Testing vs Observational Analysis

| Method | Use when |
|---|---|
| **A/B test (RCT)** | You can randomly assign treatment; gold standard for causal inference |
| **Quasi-experiment** (diff-in-diff, RD) | Random assignment is impossible; natural experiment exists |
| **Observational + matching** | Historical data only; control matching reduces confounding |
| **Bandits (multi-armed)** | Online optimization; need to minimize regret during experiment |

## A/B Test Design Checklist

Before running any A/B test:

- [ ] Define the **primary metric** (one metric, measurable, directly tied to business goal).
- [ ] Define **guardrail metrics** (metrics that must not significantly worsen: latency, error rate, retention).
- [ ] Define the **minimum detectable effect (MDE)** — smallest change worth detecting.
- [ ] Calculate **required sample size** using power analysis.
- [ ] Define experiment **duration** based on traffic, seasonality (run ≥ 1 full week cycle).
- [ ] Confirm **random assignment** works correctly (check SRM — Sample Ratio Mismatch).
- [ ] Define **decision rule** before seeing results: p < 0.05 + practical significance.

## Power Analysis and Sample Size

Required sample size per variant:

$$n = \frac{2 \cdot (z_{\alpha/2} + z_{\beta})^2 \cdot \sigma^2}{\delta^2}$$

Where:
- $\alpha$ = significance level (typically 0.05)
- $\beta$ = false negative rate (1 − power); power = 0.8 means $\beta = 0.2$
- $\sigma^2$ = variance of the metric in the control group
- $\delta$ = minimum detectable effect (absolute difference)

```python
from statsmodels.stats.power import TTestIndPower

analysis = TTestIndPower()
n = analysis.solve_power(
    effect_size=delta / sigma,   # Cohen's d
    alpha=0.05,
    power=0.80,
    ratio=1.0,                   # 1:1 assignment
    alternative='two-sided'
)
print(f"Required n per variant: {n:.0f}")
```

**Rule of thumb:** Double the estimated sample size and run for at least one full weekly cycle to account for day-of-week effects.

## Hypothesis Testing

### t-Test (continuous metrics: revenue, time-on-site)
```python
from scipy import stats

t_stat, p_value = stats.ttest_ind(control_values, treatment_values, equal_var=False)
# Use Welch's t-test (equal_var=False) as default — does not assume equal variance
```

### Chi-Squared Test (proportion metrics: conversion rate, CTR)
```python
from scipy.stats import chi2_contingency

# Contingency table: [[control_success, control_fail], [treatment_success, treatment_fail]]
table = [[control_conv, control_n - control_conv],
         [treatment_conv, treatment_n - treatment_conv]]
chi2, p_value, dof, expected = chi2_contingency(table)
```

### Mann-Whitney U (non-normal distributions, robust)
```python
stat, p_value = stats.mannwhitneyu(control_values, treatment_values, alternative='two-sided')
```

## Interpreting Results

| p-value | Correct interpretation |
|---|---|
| p < α | Reject H₀ — the difference is statistically significant at α level |
| p ≥ α | Fail to reject H₀ — insufficient evidence of a difference |
| p < 0.05 | **Not** "95% probability the treatment works"; it's the probability of observing this extreme data if H₀ true |

**Practical significance** ≠ **statistical significance**:
- A 0.01% CTR improvement with p=0.001 may not be worth shipping.
- Always report the **effect size** (Cohen's d, relative lift) alongside p-value.
- Report 95% confidence intervals, not just p-values.

```python
# Effect size (Cohen's d)
from scipy.stats import sem
pooled_std = np.sqrt((np.var(control, ddof=1) + np.var(treatment, ddof=1)) / 2)
cohens_d = (np.mean(treatment) - np.mean(control)) / pooled_std

# Confidence interval for difference in means
diff = np.mean(treatment) - np.mean(control)
se = np.sqrt(np.var(control, ddof=1)/len(control) + np.var(treatment, ddof=1)/len(treatment))
ci_low, ci_high = diff - 1.96*se, diff + 1.96*se
```

## Multiple Testing Problem (p-Hacking)

Testing multiple metrics or variants inflates the false positive rate. Corrections:

| Correction | Formula | Use |
|---|---|---|
| **Bonferroni** | $\alpha' = \alpha / m$ | Conservative; m = number of tests |
| **Benjamini-Hochberg (FDR)** | Adjust by rank | Less conservative; controls false discovery rate |
| **Pre-registration** | Declare metrics/hypothesis before the test | Best practice |

Rule: If you test 20 metrics at α=0.05, you expect **one false positive** on average. Always pre-declare your primary metric.

## Sample Ratio Mismatch (SRM)

SRM occurs when the actual assignment ratio does not match the intended ratio.

```python
# Test: is the control/treatment split actually 50/50?
from scipy.stats import chisquare

observed = [control_n, treatment_n]
expected_ratio = [0.5, 0.5]
total = sum(observed)
expected = [total * r for r in expected_ratio]
chi2, p_srm = chisquare(observed, f_exp=expected)

if p_srm < 0.01:
    raise ValueError("SRM detected — assignment mechanism is broken. Do not analyze results.")
```

An SRM means the randomization is broken. Stop the analysis and investigate the assignment pipeline.

## Common A/B Testing Mistakes

| Mistake | Why it's wrong | Fix |
|---|---|---|
| Peeking at results early and stopping | Inflates false positive rate | Use sequential testing or wait for pre-set sample size |
| Testing on only a portion of traffic then extrapolating | Biased sample | Run on full qualifying traffic |
| Not checking for SRM | Assignment bug → invalid results | Always check SRM first |
| Using the same users in control and treatment | Interference / SUTVA violation | Strict disjoint assignment |
| Ignoring novelty effect | Treatment engagement peaks at launch | Run for ≥2 weeks; check time trend |
| Multiple comparison without correction | p-hacking | Pre-register; Bonferroni or FDR correction |
