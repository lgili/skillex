---
name: "Senior Data Engineer"
description: "Senior data engineering specialist for designing, building, and operating production data pipelines, models, dbt projects, SQL queries, and workflow orchestration. Use when working with ETL/ELT pipelines, data warehousing (Snowflake, BigQuery, Redshift, Databricks), dbt models, Airflow DAGs, PySpark jobs, data quality validation, or schema design. Trigger for asks like 'data pipeline', 'ETL', 'ELT', 'dbt', 'data warehouse', 'orchestrate data', 'data quality check', 'design data model', 'Airflow DAG', 'PySpark job', 'incremental load', or 'schema migration'."
---

# Senior Data Engineer

## Overview

Use this skill to deliver data engineering work with clear architecture, validated pipelines,
optimized SQL, documented data models, and robust orchestration.

Default stance:

- Prefer idempotent, incremental pipelines over full-refresh unless full refresh is cheaper.
- Validate data at every layer boundary — bad data caught early is cheaper than bad dashboards.
- Design for the consumer, not the source — the output schema is the contract.
- Use dbt for SQL transformations in the warehouse; use PySpark for large-scale, code-intensive work.
- Orchestrate with explicit dependencies; fail fast and alert loudly.

## Core Workflow

1. **Understand requirements and scope.**
   - Identify source systems, ingestion method (batch/streaming/CDC), refresh SLA, and downstream consumers.
   - Define the grain (one row = one what?), business keys, and expected row volume.
   - Confirm the target platform and available compute budget.

2. **Design the data model.**
   - Load `references/data-modeling.md` to choose the right schema pattern.
   - For analytics: star schema (dimensional modeling) is the default choice.
   - For operational/transactional loads: normalized 3NF or data vault for auditability.
   - Document grain, primary keys, foreign keys, and SCD type before writing code.

3. **Build the extraction layer.**
   - Run `scripts/profile_dataset.py` on sample source data to understand types, nullability, and cardinality.
   - Design idempotent extraction: use watermarks, change-data-capture (CDC), or snapshot keys.
   - Never mutate the raw/bronze layer — land data exactly as received.

4. **Build the transformation layer.**
   - Follow the staging → intermediate → mart layering pattern in dbt.
   - Load `references/pipeline-patterns.md` for incremental load strategies and deduplication logic.
   - Add dbt tests: `not_null`, `unique`, `accepted_values`, `relationships` on every model.
   - Keep business logic in SQL/dbt; keep orchestration/scheduling out of transformation models.

5. **Validate data quality.**
   - At minimum: row count comparison, null rate on key columns, uniqueness on primary keys, referential integrity.
   - Use dbt tests or a dedicated quality framework (Great Expectations, Soda Core).
   - Build quality checks into the pipeline as a blocking gate — never let bad data flow downstream silently.

6. **Configure orchestration.**
   - Define DAG with explicit task dependencies, retry policy, timeout, and SLA callback.
   - Use task groups or subDAGs for complex pipelines; keep dependency graph acyclic.
   - Add data quality checkpoint tasks between extraction and transformation.

7. **Optimize for performance and cost.**
   - Load `references/sql-optimization.md` before writing complex analytical SQL.
   - Run `scripts/audit_sql_query.py` on expensive queries to surface anti-patterns.
   - Apply partitioning, clustering/Z-ordering, and materialization strategies appropriate for the platform.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| ETL/ELT pipeline architecture | `references/pipeline-patterns.md` | Designing ingestion strategy, incremental logic, CDC, upserts, deduplication, idempotency |
| SQL query design and optimization | `references/sql-optimization.md` | Writing analytical SQL, optimizing slow queries, partitioning, window functions, EXPLAIN |
| Data modeling strategies | `references/data-modeling.md` | Choosing schema pattern (star, vault, OBT), designing SCDs, normalization, grain decisions |

## Bundled Scripts

| Script | Purpose | Key Options |
|---|---|---|
| `scripts/profile_dataset.py` | Profile a CSV/Parquet/JSON dataset for types, nulls, cardinality | `file PATH`, `--format csv\|json`, `--sample N`, `--json` |
| `scripts/audit_sql_query.py` | Static analysis of SQL for anti-patterns and optimization hints | `--file SQL_FILE`, `--query "SQL"`, `--dialect bigquery\|snowflake\|generic`, `--json` |

## Constraints

### MUST DO
- Define the grain and primary key before writing any transformation.
- Make every pipeline idempotent — re-running it must produce the same result.
- Land raw/bronze data unchanged; apply all transformations in downstream layers.
- Add `not_null` and `unique` tests on every primary key and business key in dbt.
- Validate row counts at layer boundaries (source → staging → mart).
- Document the data model: grain, key definitions, refresh cadence, known data issues.
- Use incremental materialization for large tables; avoid full-refresh jobs that run longer than the SLA.

### MUST NOT DO
- Do not mutate the raw/bronze layer — it is the source of truth for re-processing.
- Do not write business transformation logic in Airflow/Prefect tasks — that belongs in dbt or Spark.
- Do not ignore referential integrity — all foreign key violations must be explained and handled explicitly.
- Do not use `SELECT *` in production SQL — enumerate columns explicitly.
- Do not skip data quality checks to meet a deadline — silent bad data is worse than a delayed pipeline.
- Do not hardcode credentials in pipeline code — use secret managers or environment variables.
- Do not deploy schema changes without a migration plan and downstream consumer notification.

## Output Template

For data engineering tasks, provide:

1. **Data model summary** — grain, keys, schema pattern chosen, and rationale.
2. **Pipeline design** — source(s), transformation layers, orchestration topology.
3. **Data quality gates** — what is checked, where, and what happens on failure.
4. **Performance notes** — partitioning strategy, expected query cost, incremental window.
5. **Risks and migration notes** — schema changes, downstream impact, rollback plan.

## Primary References

- [dbt Documentation](https://docs.getdbt.com/)
- [Apache Airflow Documentation](https://airflow.apache.org/docs/)
- [Google BigQuery Best Practices](https://cloud.google.com/bigquery/docs/best-practices-performance-overview)
- [Kimball Dimensional Modeling Techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
