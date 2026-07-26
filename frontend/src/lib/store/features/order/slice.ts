import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { OrderState } from "./types";

const initialState: OrderState = {
  selectedOrderId: null,
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    setSelectedOrderId: (state, action: PayloadAction<string | null>) => {
      state.selectedOrderId = action.payload;
    },
  },
});

export const { setSelectedOrderId } = orderSlice.actions;
export default orderSlice.reducer;
