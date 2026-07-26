import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { OrderState, OrderFilterState } from "./types";

const initialState: OrderState = {
  selectedOrderId: null,
  filters: {
    search: "",
    status: "",
    paymentStatus: "",
    paymentMethod: "",
    businessDate: "TODAY",
    page: 1,
    limit: 10,
    sortBy: "businessDate",
    sortOrder: "desc",
  },
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    setSelectedOrderId: (state, action: PayloadAction<string | null>) => {
      state.selectedOrderId = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<OrderFilterState>>) => {
      const keys = Object.keys(action.payload);
      const isOnlyPageChange = keys.length === 1 && keys[0] === "page";
      state.filters = { ...state.filters, ...action.payload };
      if (!isOnlyPageChange) {
        state.filters.page = 1;
      }
    },
    resetFilters: (state) => {
      state.filters = {
        search: "",
        status: "",
        paymentStatus: "",
        paymentMethod: "",
        businessDate: "TODAY",
        page: 1,
        limit: 10,
        sortBy: "businessDate",
        sortOrder: "desc",
      };
    },
  },
});

export const { setSelectedOrderId, setFilters, resetFilters } = orderSlice.actions;
export default orderSlice.reducer;
