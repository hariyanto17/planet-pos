# Reports & Accounting Audit Validation System

This document explains the validation, audit checks, and automated continuous reconciliation rules implemented inside the Concessions system.

---

## 1. Revenue Validation Rules

To prevent transaction leakage and ledger mismatches, the system performs validation checks on Gross and Net revenues:

### Gross Revenue Consistency
- **Rule**: Sum of all `OrderItem.subtotal` rows for completed orders must match the sum of the `Order.subtotal` column exactly.
- **Goal**: Identifies partial writes or discrepancies where individual lines do not aggregate to the order subtotal.

### Net Revenue Consistency
- **Rule**: PAID payments must correspond directly to completed order grand totals.
- **Anomalies Detected**:
  - Overpayments: Where cumulative paid payments exceed the order grandTotal.
  - Underpayments: Completed orders containing payments totaling less than the expected grandTotal.
  - Missing payments: Completed orders with zero paid payments in the database ledger.
  - Duplicate payments: Multiple payment records associated with a single order.

---

## 2. Payment Reconciliation Validation
- **Endpoint**: `GET /api/reports/audit/payments`
- Calculates ledger totals across:
  - Total active orders (PREPARING, READY, COMPLETED).
  - Fully paid order counts.
  - Awaiting collections (Pending cash).
  - Overpaid/underpaid counts.

---

## 3. Order Lifecycle Validation
- **Endpoint**: `GET /api/reports/audit/orders`
- **Goal**: Identify anomalies in operations or kitchen bottlenecks:
  - Completed orders missing payment records.
  - **Stuck Preparing**: Kitchen tickets staying in `PREPARING` status for more than 2 hours.
  - **Stuck Ready**: Kitchen tickets marked `READY` but remaining uncollected/undelivered for more than 2 hours.

---

## 4. Daily Closing Verification
- **Endpoint**: `GET /api/reports/snapshot?businessDate=YYYY-MM-DD`
- Retrieves finalized operational aggregates for a specified business shift date:
  - Total orders processed.
  - Gross sales totals.
  - Cleared PAID collections vs. pending collections.
  - Method breakdowns (CASH vs. QRIS).
- Serves as the source of truth for daily closeouts, cashier drawer audits, and PDF/accounting export generation.
