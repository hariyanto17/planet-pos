# Database Query Performance Analysis

This document outlines index checks, queries validation, and PostgreSQL `EXPLAIN ANALYZE` execution timings on a dataset of **100,000 orders, 300,000 order items, and 100,000 payments**.

---

## 1. Summary Report Metrics (30-day range)

- **Query**: Aggregates Gross, Net, Discount, and AOV using parameter values.
- **Execution Time**: **`202.30 ms`** (Target: < 500ms).
- **Index Used**: `Order_status_businessDate_idx` (Bitmap Index Scan).
- **Rows Processed**: ~26,801 rows scanned inside index.

### Query Plan Snippet
```
Finalize Aggregate  (actual time=36.775..38.112 rows=1.00 loops=1)
  -> Parallel Bitmap Heap Scan on "Order" o  (actual time=0.325..1.824 rows=8933.67 loops=3)
        -> Bitmap Index Scan on "Order_status_businessDate_idx"  (actual time=0.748..0.748 rows=26801.00 loops=1)
```

---

## 2. Payment Status Report Metrics (30-day range)

- **Query**: Groups counts and totals by payment status.
- **Execution Time**: **`11.06 ms`** (Target: < 500ms).
- **Index Used**: `Payment_status_createdAt_idx`.
- **Rows Processed**: Aggregated status counts in index.

---

## 3. Reconciliation Report Metrics (30-day range)

- **Query**: Compares expected order totals against collected paid transaction items.
- **Execution Time**: **`58.56 ms`** (Target: < 500ms).
- **Index Used**: `Order_businessDate_idx`, `Payment_status_createdAt_idx`.
- **Rows Processed**: ~26,000 payments.

---

## 4. Product Ranking Report Metrics (30-day range)

- **Query**: Groups sales volume and revenues using `OrderItem` snapshots with limit and offset.
- **Execution Time**: **`251.91 ms`** (Target: < 1000ms).
- **Index Used**: `OrderItem_createdAt_idx`.
- **Rows Processed**: Direct sequential scans on index bounds.
