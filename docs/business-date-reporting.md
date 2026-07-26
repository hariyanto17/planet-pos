# Business Date Reporting vs. Creation Timestamp

This document explains the accounting design rationale behind using `Order.businessDate` instead of the system-level `Order.createdAt` timestamp for all financial ledger calculations.

---

## 1. The Discrepancy Problem

In movie theaters, food concessions, and dining businesses, the operational day does not end at exactly midnight. 
- A cinema transaction occurring on **Friday night at 00:30 AM (Saturday calendar day)** belongs to the **Friday night business shift**.
- If reports simply count transactions by midnight calendar boundaries (using `createdAt`), the Friday sales ledger will appear under-reported, and Saturday will contain post-midnight records that skew daily cash reconciliation audits.

---

## 2. Operational Definition of `businessDate`

- **`businessDate`**: Reflects the active business operation date that is currently open at checkout. It is set at the shift level and assigned to all transactions during that shift.
- **`createdAt`**: Represents the literal, physical UTC datetime when the SQL row was written to the PostgreSQL database table.

---

## 3. Financial Close Verification

By basing all queries on `businessDate`, the Reports and Accounting Module guarantees:
1. **Accurate Cash Drawer Counts**: Cash drawers reconciled at the end of the shift match the sales recorded on that `businessDate`.
2. **Accurate Closing Ledger**: Shift totals align cleanly with theater sales cycles rather than calendar days.
3. **Auditable Reporting Consistency**: Re-running daily reports retrospectively yields the same figures regardless of timezone shifts.
