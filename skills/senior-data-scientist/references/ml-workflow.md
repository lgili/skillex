# Machine Learning Workflow

## End-to-End Process

```
Define problem → EDA → Split data → Feature engineering → Baseline → Model selection → Tune → Evaluate → Explain → Deploy
```

**Rule:** Never touch the test set until the final evaluation. Everything before that is training/validation only.

## Splitting Strategy

### Tabular / cross-sectional data
```python
from sklearn.model_selection import train_test_split

# 70% train, 15% validation, 15% test
X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)
```

### Time-series / temporal data
```python
# NEVER shuffle time-series — use chronological split
split_idx = int(len(df) * 0.8)
train = df.iloc[:split_idx]
test  = df.iloc[split_idx:]

# For CV, use TimeSeriesSplit
from sklearn.model_selection import TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5)
```

## Cross-Validation Strategy

| Situation | CV strategy |
|---|---|
| Default classification | `StratifiedKFold(n_splits=5)` |
| Regression | `KFold(n_splits=5)` |
| Time series | `TimeSeriesSplit(n_splits=5)` |
| Small dataset (<1000 rows) | `StratifiedKFold(n_splits=10)` or leave-one-out |
| Grouped data (same user in train+val = leakage) | `GroupKFold` |

Always pass `random_state=42` (or any fixed seed) to all CV splitters.

## Metric Selection

### Classification
| Metric | Use when |
|---|---|
| Accuracy | Balanced classes, equal cost of error types |
| F1 (macro/weighted) | Imbalanced classes; care about both precision and recall |
| AUC-ROC | Need ranking quality; good for imbalanced |
| Precision @ k | Ranking/recommendation; top-k correctness matters |
| Log loss | Calibrated probability outputs needed |
| Recall (sensitivity) | False negatives are very costly (medical, fraud) |

### Regression
| Metric | Use when |
|---|---|
| RMSE | Large errors should be penalized more; units interpretable |
| MAE | Outlier-robust; interpretable in original units |
| MAPE | Percentage error; when relative magnitude matters |
| R² | Share of variance explained; convenient for reporting |

### Primary vs Secondary Metric
Always pick **one primary metric** for model selection decisions. Report secondary metrics for context, but don't use them to choose.

## Handling Imbalanced Classes

| Strategy | How | Use when |
|---|---|---|
| `class_weight='balanced'` | Inverse-frequency weighting in the loss | Quick fix; works for logistic regression, SVMs, trees |
| SMOTE (oversampling) | Synthesize minority class examples | Moderate imbalance (5–30% minority) |
| Random undersampling | Remove majority class rows | Large dataset; time allows |
| Threshold tuning | Adjust decision threshold after training | When model calibration is good |
| Focal loss | Down-weight easy examples | Deep learning, very severe imbalance |

Note: Never oversample before splitting — you will cause data leakage.

## Detecting Data Leakage

Common leakage patterns:

| Pattern | Description | Fix |
|---|---|---|
| Target encoding before split | Encode target mean into feature using full dataset | Fit encoding inside CV fold only |
| Future data in features | Feature contains information from after prediction time | Remove column; use target date filter |
| Rows from same entity in train and test | User has rows in both splits (group leakage) | Use `GroupKFold` |
| Normalization fit on full data | `scaler.fit(X_full)` then split | Always `scaler.fit(X_train)` only |
| ID or timestamp as feature | Model memorizes IDs | Drop ID and datetime columns from features |

## Model Selection Baseline

Always start with a simple baseline before complex models:

| Problem type | Baseline |
|---|---|
| Binary classification | `DummyClassifier(strategy='most_frequent')` |
| Multi-class | `DummyClassifier(strategy='stratified')` |
| Regression | `DummyRegressor(strategy='median')` |
| Time-series | Last value / seasonal naive |

A complex model should significantly beat the baseline to justify the added complexity.

## Model Card Template

Every deployed model should have a model card documenting:

```
## Model Card: {model_name}

### Problem
Target variable: {target}
Prediction horizon: {horizon}
Business metric: {metric}

### Data
Training period: {start} to {end}
Training size: {N rows}
Features: {N features} (see features.md)
Known data issues: {list}

### Performance (holdout test set)
Primary metric: {value}
Secondary metrics: {values}
Baseline performance: {value}

### Limitations
- {limitation 1}
- {limitation 2}

### Retraining schedule
Trigger: {drift threshold / time interval}
Owner: {team/person}
```
