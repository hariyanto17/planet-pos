export interface ReportFilterState {
  preset: "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM";
  startDate: string;
  endDate: string;
  cashierId?: string;
  shiftStatus?: string;
  differenceStatus?: string;
}

export interface SummaryReport {
  grossRevenue: number;
  netRevenue: number;
  discountTotal: number;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
}

export interface PaymentReport {
  cash: {
    paid: number;
    pending: number;
  };
  qris: {
    paid: number;
    pending: number;
  };
  cancelled: number;
}

export interface ReconciliationReport {
  expectedRevenue: number;
  collectedRevenue: number;
  outstandingAmount: number;
  unpaidOrderCount: number;
  unpaidOrderValue: number;
}

export interface SalesReportEntry {
  date: string;
  orders: number;
  revenue: number;
}

export interface ProductRankingEntry {
  productId?: string;
  productName: string;
  sku?: string;
  category?: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface PaymentAuditReport {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  overpaidOrders: number;
  underpaidOrders: number;
}

export interface OrderAuditReport {
  invalidCompletedOrders: {
    orderId: string;
    orderNumber: string;
    grandTotal: number;
    businessDate: string;
  }[];
  stuckPreparingOrders: {
    orderId: string;
    orderNumber: string;
    grandTotal: number;
    createdAt: string;
  }[];
  stuckReadyOrders: {
    orderId: string;
    orderNumber: string;
    grandTotal: number;
    createdAt: string;
  }[];
}

export interface AccountingSnapshotReport {
  businessDate: string;
  orders: number;
  grossRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  cashRevenue: number;
  qrisRevenue: number;
  generatedAt: string;
}
