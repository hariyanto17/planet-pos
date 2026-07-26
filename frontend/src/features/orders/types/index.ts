export interface OrderFilterState {
  page: number;
  limit: number;
  search: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  source: string;
  businessDate: "ALL" | "TODAY" | "YESTERDAY" | "CUSTOM";
  customDateStart?: string;
  customDateEnd?: string;
  sortBy: "createdAt" | "displayNumber" | "grandTotal" | "businessDate";
  sortOrder: "asc" | "desc";
}
