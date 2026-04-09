# SQL Query Design and Optimization

## Fundamental Rules

1. **Never use `SELECT *` in production** — enumerate columns explicitly. It breaks on schema changes and transfers unnecessary data.
2. **Filter early** — push WHERE predicates as close to the source as possible.
3. **Aggregate late** — join before aggregating to avoid aggregating redundant rows.
4. **Profile before optimizing** — use EXPLAIN / EXPLAIN ANALYZE to understand actual cost.

## Reading Query Plans

### BigQuery
```sql
-- Run EXPLAIN (or view query plan in UI: Execution Details tab)
-- Look for: stages with highest bytes processed, slot time, shuffle data
EXPLAIN SELECT ...
```

### Snowflake
```sql
-- After running a query, check Query Profile in the console
-- Look for: partition scans (want >90% pruned), spill to disk (bad), join explosion
```

### Postgres / Redshift
```sql
EXPLAIN ANALYZE SELECT ...
-- Look for: Seq Scan (bad on large tables), Hash Join vs Nested Loop, high actual rows vs estimate
```

## Partition Pruning

Partitioned tables only read relevant partitions when filters match the partition key.

```sql
-- GOOD: filter hits partition key (event_date)
SELECT COUNT(*) FROM events WHERE event_date = '2024-03-01'

-- BAD: wrapping partition key in function prevents pruning
SELECT COUNT(*) FROM events WHERE DATE(event_timestamp) = '2024-03-01'
-- Fix: filter on the raw partition column
WHERE event_timestamp >= '2024-03-01' AND event_timestamp < '2024-03-02'
```

## Clustering and Z-Ordering

For columns frequently used in WHERE and JOIN (but not the partition key):
- **Snowflake**: `CLUSTER BY (user_id, event_type)` — automatic micro-partitioning.
- **Databricks/Delta**: `OPTIMIZE table ZORDER BY (user_id, event_type)`.
- **BigQuery**: `CLUSTER BY user_id, event_type` in CREATE TABLE statement.

## Window Functions vs Subqueries

Window functions are generally more efficient than correlated subqueries:

```sql
-- BAD: correlated subquery (N+1 pattern)
SELECT id, amount,
  (SELECT SUM(amount) FROM orders o2 WHERE o2.customer_id = o.customer_id) AS customer_total
FROM orders o

-- GOOD: window function
SELECT id, amount,
  SUM(amount) OVER (PARTITION BY customer_id) AS customer_total
FROM orders
```

## CTE vs Subquery vs Temp Table

| Approach | When to use |
|---|---|
| CTE (`WITH`) | Readability; reused intermediate results; modern engines optimize them equally to subqueries |
| Subquery | Simple single-use derivation; when CTE syntax feels heavy |
| Temp/Materialized table | When the same intermediate result is used in multiple queries; when the optimizer mis-estimates CTE row counts |

Note: In BigQuery and Snowflake, CTEs are **not** materialized unless you explicitly create a temp table. Reference a CTE multiple times and it may be re-executed each time.

## JOIN Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Cartesian join (`FROM a, b` without condition) | Multiplies row counts, blows up | Always use explicit `JOIN ... ON` |
| Non-sargable predicates | Prevents index/partition use | Avoid functions on filter columns |
| Joining on `NULL` | `NULL = NULL` is FALSE in SQL | Use `COALESCE` or `IS NOT DISTINCT FROM` |
| Fanout join (1-to-many without dedup) | Duplicates rows unexpectedly | Dedup before joining or use `SUM() / COUNT(DISTINCT)` |
| Skewed join key (`user_id = 0` for all guests) | One partition gets all the work | Isolate skewed values; broadcast small dimension |

## Aggregation Patterns

```sql
-- APPROXIMATE COUNT DISTINCT (much faster on big data platforms)
-- BigQuery
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events

-- Snowflake
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events

-- Percentile (exact vs approximate)
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)  -- exact
SELECT APPROX_PERCENTILE(latency_ms, 0.5)                         -- Snowflake approximate
SELECT APPROX_QUANTILES(latency_ms, 100)[OFFSET(50)] AS p50       -- BigQuery approximate
```

## Incremental Query Patterns (dbt)

```sql
-- dbt incremental model: only process new rows
{{
  config(
    materialized = 'incremental',
    unique_key = 'event_id',
    incremental_strategy = 'merge'
  )
}}

SELECT * FROM {{ source('events', 'raw_events') }}
{% if is_incremental() %}
  WHERE event_timestamp > (SELECT MAX(event_timestamp) FROM {{ this }})
{% endif %}
```

## Common SQL Anti-Patterns Checklist

- [ ] `SELECT *` in any model or analytical query
- [ ] `DISTINCT` used to paper over a join fanout (fix the join instead)
- [ ] Correlated subquery or scalar subquery in SELECT that could be a window function
- [ ] `NOT IN (subquery)` — use `NOT EXISTS` or `LEFT ANTI JOIN` (handles NULLs correctly)
- [ ] `OR` in JOIN conditions — splits into two joins with `UNION ALL` for better plan
- [ ] `HAVING` used instead of `WHERE` on non-aggregated columns
- [ ] Missing `LIMIT` on exploratory queries on billion-row tables
