export interface OrderFilterState {
  search: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  businessDate: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface OrderState {
  selectedOrderId: string | null;
  filters: OrderFilterState;
}
