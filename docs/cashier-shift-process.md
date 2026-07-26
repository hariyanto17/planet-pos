# Cashier Shift & Cash Drawer Process

This document details the operational guidelines for opening shifts, handling currency tenders, and closing drawers inside the concession terminals.

---

## 1. Opening Cashier Shift
Before processing any concession orders, cashiers must establish their operational shift:
- **Starting capital**: Cashiers input the physically counted starting capital inside their drawer (e.g. `500,000 Rp`).
- **Active state**: The system records the start time and designates this cashier active. Future cashier checkouts are automatically attached to this shift.

---

## 2. Shift Attachment Rule
- **Cashier checkouts**: Orders checked out by cashier terminals automatically link `cashierShiftId` directly to the `Payment` records.
- **Self-Orders**: Guest checkouts do not link to any shift until payment collection occurs at the counter. When the cashier confirms the pending cash payment, the payment is attached to the active shift of the confirming cashier.

---

## 3. Closing Drawer Reconciliation
At shift close, the cashier triggers the close sequence:
- **Expected Cash**: Calculated by the backend database layer:
  `Expected Cash = Opening Cash + Cash Paid Sales - Refunds`
- **Reconciliation Audit**: Cashiers input the counted physical drawer total.
- **Difference Tracking**: The system computes the difference offset:
  `Difference = Actual Counted Cash - Expected Cash`
- **Closed State**: The shift status updates to `CLOSED`, locking the shift from receiving further payment confirmations.
