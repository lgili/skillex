---
name: "Senior Data Scientist"
description: "Senior data science specialist for machine learning model development, feature engineering, statistical analysis, A/B experiment design, model evaluation, explainability, and stakeholder communication. Use when building ML models, exploring datasets, designing experiments, performing hypothesis tests, auditing model quality, or interpreting results. Trigger for asks like 'build a model', 'feature engineering', 'train ML', 'A/B test', 'statistical test', 'evaluate model', 'cross-validation', 'scikit-learn pipeline', 'model performance', 'data exploration', 'EDA', or 'explain predictions'."
---

# Senior Data Scientist

## Overview

Use this skill to deliver data science work with rigorous methodology, reproducible experiments,
well-evaluated models, and actionable insights communicated clearly to non-technical stakeholders.

Default stance:

- Define the success metric and business baseline before touching data.
- Prevent data leakage at every step — it is the most common source of deceptively good models.
- Prefer simple, interpretable models when they meet the performance threshold.
- Cross-validate everything; never trust a single train/test split for model selection.
- A model only ships when it has been evaluated on holdout data and explained to stakeholders.

## Core Workflow

1. **Define the problem and success criteria.**
   - Confirm the target variable (what exactly are we predicting?), prediction horizon, and serving context.
   - Establish the business baseline (current manual process, rule-based system, or naive model).
   - Define the primary metric and acceptable threshold before seeing the data.
   - Identify constraints: latency, explainability requirements, protected attributes (fairness).

2. **Explore and validate the data (EDA).**
   - Run `scripts/profile_features.py` to get a quick column-by-column quality and type profile.
   - Check target variable distribution — is it imbalanced? What is the base rate?
   - Inspect temporal coverage, missing data patterns, outliers, and duplicate records.
   - Identify potential leakage columns (fields populated after the prediction event).
   - Load `references/feature-engineering.md` to plan the encoding and transformation strategy.

3. **Split the data correctly — before feature engineering.**
   - Create train / validation / test splits before any fit-transform operation.
   - For time-series data, always use chronological split — never random shuffle.
   - Holdout test set is locked and untouched until the final evaluation.

4. **Engineer features.**
   - Apply feature transformations inside a pipeline (sklearn Pipeline or equivalent) to prevent leakage.
   - Document every feature: source column, transformation, business meaning, expected range.
   - Encode categoricals, scale numerics, handle missing values — all inside the pipeline.
   - Evaluate feature importance early; drop zero-variance and near-constant features.

5. **Build and evaluate models.**
   - Start with a baseline model (logistic regression, linear regression, median predictor).
   - Use cross-validation (StratifiedKFold for classification) for model selection.
   - Compare candidates on primary metric + secondary metrics (precision/recall tradeoff, calibration).
   - Load `references/ml-workflow.md` for the full evaluation checklist and metric selection guide.

6. **Tune and select the best model.**
   - Run hyperparameter search (RandomizedSearchCV or Optuna) on the training fold only.
   - Evaluate final model once on the held-out test set — report this as the headline result.
   - Run `scripts/audit_ml_code.py` to check for leakage, missing seeds, and evaluation gaps.

7. **Explain, document, and deliver.**
   - Compute feature importances, SHAP values, or partial dependence plots.
   - Check for bias: evaluate performance across demographic subgroups if applicable.
   - Write a model card: problem, data, methodology, metrics, limitations, retraining schedule.
   - Load `references/experiment-design.md` when the result needs statistical validation (A/B test).

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| End-to-end ML workflow and evaluation | `references/ml-workflow.md` | Building pipelines, choosing metrics, cross-validation strategy, avoiding leakage, model cards |
| Feature engineering and selection | `references/feature-engineering.md` | Encoding strategies, scaling, binning, interaction features, feature selection methods |
| Experiment and A/B test design | `references/experiment-design.md` | Designing A/B tests, power analysis, hypothesis testing, statistical significance, p-values |

## Bundled Scripts

| Script | Purpose | Key Options |
|---|---|---|
| `scripts/profile_features.py` | Profile dataset columns for ML readiness | `file PATH`, `--target COL`, `--sample N`, `--json` |
| `scripts/audit_ml_code.py` | Audit Python ML code for anti-patterns and leakage risks | `file PATH`, `--json` |

## Constraints

### MUST DO
- Split data before any feature engineering or transformation fitting.
- Always use cross-validation for model selection; never rely on a single split.
- Report the final performance on a held-out test set that was never used during tuning.
- Set a random seed (`random_state`) on all stochastic operations for reproducibility.
- Document every feature transformation and its rationale.
- Check for data leakage: no column populated after the prediction timestamp should appear as a feature.
- Provide confidence intervals or uncertainty estimates alongside point predictions.

### MUST NOT DO
- Do not apply `fit_transform` to the test set — call `transform` only.
- Do not evaluate model performance on training data and report it as generalization performance.
- Do not select the final model based on test set performance — use cross-validation on train/val for selection.
- Do not ignore class imbalance without an explicit strategy (reweighting, oversampling, threshold tuning).
- Do not deploy a model without explaining its predictions to the business stakeholder.
- Do not optimize for accuracy alone on imbalanced datasets — use F1, AUC-ROC, or precision-recall.
- Do not use "black box" models when a simpler, explainable model achieves acceptable performance.

## Output Template

For data science tasks, provide:

1. **Problem summary** — target variable, metric, baseline, success threshold.
2. **Data overview** — rows, columns, target distribution, key quality issues found.
3. **Feature engineering summary** — transformations applied and rationale.
4. **Model results** — cross-val metrics, final test set metrics, comparison to baseline.
5. **Explainability** — top features, directionality, any bias findings.
6. **Limitations and next steps** — known data gaps, retraining triggers, deployment considerations.

## Primary References

- [scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)
- [pandas Documentation](https://pandas.pydata.org/docs/)
- [SHAP Documentation](https://shap.readthedocs.io/)
- [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course)
