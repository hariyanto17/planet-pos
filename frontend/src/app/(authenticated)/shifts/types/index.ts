export interface CashierShiftData {
  id?: string;
  status: "OPEN" | "CLOSED";
  cashier?: string;
  openedAt?: string;
  openingCash?: number;
  sales?: number;
  cashSales?: number;
  qrisSales?: number;
}

export interface ShiftReconciliationData {
  openingCash: number;
  cashSales: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
}
