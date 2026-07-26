import { RootState } from "../../store";

export const selectSelectedOrderId = (state: RootState) => state.order.selectedOrderId;
