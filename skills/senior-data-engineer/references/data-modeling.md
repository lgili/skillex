# Data Modeling Strategies

## Choosing the Right Schema Pattern

| Pattern | Best for | Tradeoffs |
|---|---|---|
| **Star schema** | Analytics, BI dashboards, self-service queries | Simple queries; some denormalization/redundancy |
| **Snowflake schema** | Normalized dimensions with sub-hierarchies | Less redundancy; harder ad-hoc queries |
| **One Big Table (OBT)** | High-concurrency, single-entity queries; semi-structured data | Simple queries; massive redundancy; hard to maintain |
| **Data Vault** | Auditability, regulatory, many source systems, high change rate | Complex; verbose; needs tooling |
| **3NF normalized** | OLTP source replication (staging layer) | Normalized for writes; slow for analytics |

**Default recommendation:** Star schema for the Gold/mart layer; 3NF or raw in Bronze; OBT for specific high-performance use cases.

## Star Schema Components

### Fact Table
- Contains measurable **business events** (sales, clicks, logins, transactions).
- Rows represent one event at the declared grain.
- Contains foreign keys to dimensions + numeric measures.
- Should be tall (many rows) and narrow (few columns).

```sql
CREATE TABLE fact_orders (
  order_key       BIGINT PRIMARY KEY,     -- surrogate key
  order_id        VARCHAR,                -- natural/business key
  customer_key    BIGINT REFERENCES dim_customer,
  product_key     BIGINT REFERENCES dim_product,
  date_key        INT    REFERENCES dim_date,
  order_date      DATE,
  quantity        INT,
  unit_price      NUMERIC(10,2),
  total_amount    NUMERIC(12,2)
);
```

### Dimension Table
- Contains descriptive **context** about entities (customers, products, geography).
- Contains the surrogate key + natural key + descriptive attributes.
- Should be wide (many descriptive columns) and shorter (fewer rows than facts).

```sql
CREATE TABLE dim_customer (
  customer_key    BIGINT PRIMARY KEY,     -- surrogate key (never exposed to business)
  customer_id     VARCHAR UNIQUE NOT NULL, -- natural/business key
  full_name       VARCHAR,
  email           VARCHAR,
  segment         VARCHAR,
  country         VARCHAR,
  valid_from      DATE,
  valid_to        DATE,
  is_current      BOOLEAN DEFAULT TRUE
);
```

## Grain Definition

The grain is the most atomic level of detail in a fact table. Every row must represent exactly one grain instance.

Examples:
- `fact_page_views` — one row per page view event per session
- `fact_daily_sales` — one row per product per store per day
- `fact_orders` — one row per order line item (not per order header)

**Always define the grain before designing the schema.** Adding measures that belong at different grains into the same table is a modeling error.

## Surrogate Keys vs Natural Keys

| | Surrogate key | Natural key |
|---|---|---|
| Definition | System-generated integer/UUID | Business identifier (order_id, sku, email) |
| Stability | Stable — never changes | May change (email updates, ID reassignment) |
| Join performance | Faster (integer) | Slower (string), especially for large tables |
| Use in dim tables | Primary key (`customer_key`) | Preserved as separate column (`customer_id`) |

Rule: **Always add a surrogate key** to dimension tables. Preserve natural keys for reference and audit.

## Slowly Changing Dimensions (SCD)

```sql
-- SCD Type 2: track historical changes to dimension attributes
-- When a customer changes segment, expire the old row and insert a new one

-- Old row (expired)
UPDATE dim_customer
SET valid_to = CURRENT_DATE - 1, is_current = FALSE
WHERE customer_id = 'C001' AND is_current = TRUE;

-- New row (current)
INSERT INTO dim_customer (customer_id, segment, valid_from, valid_to, is_current)
VALUES ('C001', 'Premium', CURRENT_DATE, '9999-12-31', TRUE);
```

In dbt, use `dbt snapshot` with `strategy='check'` for automated SCD Type 2 management.

## Date Dimension

Every star schema needs a `dim_date` table populated for all dates in the analysis range:

```sql
CREATE TABLE dim_date (
  date_key        INT PRIMARY KEY,   -- YYYYMMDD integer
  full_date       DATE,
  year            INT,
  quarter         INT,
  month           INT,
  month_name      VARCHAR,
  week_of_year    INT,
  day_of_week     INT,
  day_name        VARCHAR,
  is_weekend      BOOLEAN,
  is_holiday      BOOLEAN
);
```

## Data Vault 2.0 (brief)

Used when: regulatory audit trail is required; many source systems with frequent schema changes; very high rate of attribute change.

Core entities:
- **Hub** — Distinct business entity, natural key only. e.g., `hub_customer(customer_hk, customer_id, load_date, record_source)`
- **Link** — Relationship between two or more Hubs. e.g., `link_order_customer(order_customer_hk, order_hk, customer_hk)`
- **Satellite** — Attribute changes over time, attached to a Hub or Link. e.g., `sat_customer_profile(customer_hk, load_date, full_name, email, ...)`

Avoid Data Vault for small teams or greenfield projects — the complexity cost is high.

## Normalization Quick Reference

| Normal Form | Rule |
|---|---|
| 1NF | No repeating groups; each column is atomic |
| 2NF | 1NF + no partial dependency on composite key |
| 3NF | 2NF + no transitive dependency (non-key column determines another non-key) |

Mart/analytics tables may intentionally violate 3NF (denormalized for read performance) — that is acceptable and expected.
