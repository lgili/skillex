# Feature Engineering Reference

## Feature Types and Default Treatment

| Feature type | Detection | Default transformation |
|---|---|---|
| Continuous numeric | `float`, wide range | StandardScaler or MinMaxScaler |
| Discrete numeric (count-like) | `int`, low range | Leave as-is or RobustScaler if outliers |
| Ordinal categorical | String, natural order | OrdinalEncoder with explicit order |
| Nominal categorical (low-card) | String, ≤15 unique | OneHotEncoder (drop first to avoid multicollinearity) |
| Nominal categorical (high-card) | String, >15 unique | TargetEncoder (in fold), HashingEncoder, or embedding |
| Binary (yes/no, flag) | 2 unique values | LabelEncoder (0/1) |
| Datetime | datetime dtype | Extract: year, month, day, hour, dayofweek, is_weekend |
| Text | Long string | TF-IDF, count vectorizer, or sentence embedding |
| Target | What we predict | Never use as a feature |

## Numeric Feature Transformations

### Scaling
```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler

# StandardScaler: zero mean, unit variance — works for most algorithms
# MinMaxScaler: [0,1] range — good for neural networks, kNN
# RobustScaler: uses median & IQR — robust to outliers
```

**Always fit on training data only:**
```python
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)   # NOT fit_transform!
```

### Log Transform (for right-skewed distributions)
```python
import numpy as np
X['log_amount'] = np.log1p(X['amount'])   # log1p handles zero values safely
```

Use when: distribution has a long right tail (income, prices, counts).

### Binning / Discretization
```python
pd.cut(X['age'], bins=[0, 18, 35, 50, 65, 100], labels=['<18', '18-35', '35-50', '50-65', '65+'])
pd.qcut(X['revenue'], q=4, labels=['Q1','Q2','Q3','Q4'])   # equal-frequency bins
```

Use when: feature has a non-linear relationship with target; when domain knowledge suggests ranges are meaningful.

## Categorical Feature Encoding

### OneHotEncoding (OHE)
```python
from sklearn.preprocessing import OneHotEncoder
ohe = OneHotEncoder(drop='first', sparse_output=False)  # drop='first' removes multicollinearity
```
Problem: creates many columns for high-cardinality features (100 categories → 99 columns).

### Ordinal Encoding
```python
from sklearn.preprocessing import OrdinalEncoder
enc = OrdinalEncoder(categories=[['low', 'medium', 'high']])
```
Only use when there is a genuine ordinal relationship.

### Target Encoding (for high-cardinality)
```python
# Use inside a cross-validation fold to prevent leakage
import category_encoders as ce
enc = ce.TargetEncoder(cols=['city'])
X_train_encoded = enc.fit_transform(X_train, y_train)
X_test_encoded  = enc.transform(X_test)   # NOT fit_transform!
```
Risk: causes leakage if fitted on full dataset before split. Always encode inside the CV pipeline.

## Missing Value Strategies

| Pattern | Strategy |
|---|---|
| Random / MCAR | `SimpleImputer(strategy='median')` for numeric, `most_frequent` for categorical |
| Non-random / MAR | `IterativeImputer` (multivariate) — more accurate, slower |
| Structurally missing (missing = "none") | Encode as a new category: `"UNKNOWN"` |
| High null rate (>50%) | Consider dropping column; add binary `{col}_is_missing` flag |
| Time-series | Forward fill (`ffill`) or interpolation |

Always add a binary indicator column `{feature}_missing` when the fact of missingness is itself informative.

## Feature Selection Methods

| Method | Use when |
|---|---|
| **Variance threshold** | Remove near-zero-variance features first as baseline cleanup |
| **Pearson / Spearman correlation** | Identify highly correlated pairs (>0.95); drop one |
| **Mutual information** | Non-linear dependencies between feature and target |
| **L1 / Lasso regularization** | Built-in feature selection while training linear models |
| **Tree-based importance** (`feature_importances_`) | Quick importance ranking from RF/GBM |
| **SHAP values** | Most reliable; global + local importance; model-agnostic |
| **Recursive Feature Elimination (RFE)** | Small feature set; expensive but thorough |

```python
from sklearn.feature_selection import mutual_info_classif, SelectKBest
selector = SelectKBest(mutual_info_classif, k=20)
X_selected = selector.fit_transform(X_train, y_train)
```

## Interaction and Polynomial Features

```python
from sklearn.preprocessing import PolynomialFeatures
poly = PolynomialFeatures(degree=2, interaction_only=True)
X_poly = poly.fit_transform(X[['age', 'income', 'tenure']])
```

Use sparingly — polynomial features explode column count and risk overfitting. Prefer manual domain-driven interactions over automated polynomial expansion for tabular data.

## Datetime Feature Extraction

```python
df['date'] = pd.to_datetime(df['date'])
df['year']        = df['date'].dt.year
df['month']       = df['date'].dt.month
df['day_of_week'] = df['date'].dt.dayofweek      # 0=Monday
df['hour']        = df['date'].dt.hour
df['is_weekend']  = df['date'].dt.dayofweek >= 5
df['quarter']     = df['date'].dt.quarter
# Cyclical encoding for periodic features (avoids 23→0 discontinuity)
df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
```
