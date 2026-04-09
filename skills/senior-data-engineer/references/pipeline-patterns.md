# Data Pipeline Architecture Patterns

## ETL vs ELT

| Pattern | Description | Use when |
|---|---|---|
| **ETL** (Extract → Transform → Load) | Transform before loading into the warehouse | Source data is sensitive; warehouse storage is expensive; transformations require non-SQL logic |
| **ELT** (Extract → Load → Transform) | Load raw first, transform inside the warehouse | Warehouse has abundant compute (BigQuery, Snowflake, Redshift); want raw data auditable |

Modern data stacks (dbt + Snowflake/BigQuery) favor **ELT**: load raw, version it, transform with SQL.

## Layer Architecture (Medallion)

```
Bronze (raw)  →  Silver (staging/cleaned)  →  Gold (marts/aggregates)
```

In dbt terms:
- `models/staging/` — 1:1 with source tables, renamed, cast, light filtering. No joins.
- `models/intermediate/` — Joins, business logic, helper datasets. Not exposed externally.
- `models/marts/` — Final dimensional/facts tables consumed by BI tools and analysts.

**Rule:** Never modify the Bronze/raw layer. Re-process from raw when logic changes.

## Incremental Load Strategies

| Strategy | How it works | Best for |
|---|---|---|
| **Full refresh** | Truncate and reload every run | Small tables (<1M rows), lookup/reference data |
| **Watermark / high-water mark** | Track `updated_at` or `id` max, load only new rows | Append-only logs, event tables |
| **CDC (Change Data Capture)** | Capture INSERT/UPDATE/DELETE from database log (binlog/WAL) | OLTP sources with frequent updates |
| **Snapshot (SCD Type 2)** | Store full row snapshots daily, detect changes | Slowly changing dimensions, audit history |
| **Upsert (MERGE)** | Match on natural key; insert new, update existing | Dimensions with occasional updates |

### Idempotency Rule
Every pipeline run should be idempotent: re-running it with the same inputs produces the same outputs. Achieve this by:
- Using `INSERT OVERWRITE partition` rather than plain INSERT.
- Using `MERGE` (upsert) rather than blind INSERT for mutable tables.
- Including a `processed_at` watermark in the target for re-run detection.

## Deduplication Patterns

When a source delivers duplicates (at-least-once delivery, Kafka consumer replays):

```sql
-- Deduplicate using ROW_NUMBER
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY natural_key ORDER BY updated_at DESC) AS rn
  FROM staging.events
)
SELECT * FROM ranked WHERE rn = 1
```

In dbt, use the `dbt_utils.deduplicate` macro or a custom `unique_key` in incremental models.

## Slowly Changing Dimensions (SCD)

| Type | Behavior | How to implement |
|---|---|---|
| SCD 0 | Never changes | Simple dimension; ignore updates |
| SCD 1 | Overwrite current value | Simple upsert; no history |
| SCD 2 | Keep full history with effective dates | `valid_from`, `valid_to`, `is_current` columns; insert new row on change |
| SCD 3 | Keep current + previous value | Extra column `prev_value`; limited history |

SCD Type 2 is the most common in analytics. Use dbt's `snapshot` functionality to automate it.

## Streaming Pipelines (Kafka / Pub-Sub)

Key concepts:
- **Topic** — Named stream of messages (like a table equivalent).
- **Consumer group** — Set of consumers sharing work; each partition is consumed by one consumer.
- **Offset** — Position in the topic; commit after successful processing to avoid re-processing.
- **At-most-once** vs **At-least-once** vs **Exactly-once** delivery semantics.
- For analytics, at-least-once + idempotent sinks is the pragmatic choice.

Micro-batch pattern: consume Kafka events → buffer → flush to staging table every N seconds/minutes → run dbt on top.

## Data Quality Checks at Pipeline Gates

| Check type | Example | Where |
|---|---|---|
| Row count | `COUNT(*) > 0` | After every extraction |
| Null rate | `SUM(CASE WHEN id IS NULL THEN 1 END) / COUNT(*) < 0.01` | On primary/foreign keys |
| Uniqueness | `COUNT(DISTINCT id) = COUNT(*)` | On natural keys |
| Referential integrity | All FK values exist in dimension table | After staging, before mart |
| Freshness | `MAX(updated_at) > NOW() - INTERVAL '25 HOURS'` | On time-sensitive tables |
| Distribution drift | `AVG(amount) BETWEEN 95 AND 105` of historical baseline | On business-critical columns |

Implement with dbt tests, Great Expectations, or Soda Core. Make failures pipeline-blocking.
