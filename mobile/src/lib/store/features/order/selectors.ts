import { RootState } from "../../store";

export const selectSelectedOrderId = (state: RootState) => state.order.selectedOrderId;
export const selectOrderFilters = (state: RootState) => state.order.filters;
