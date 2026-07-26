import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PaymentState } from "./types";
import { PaymentMethod } from "@shared/types";

const initialState: PaymentState = {
  method: "CASH",
  receivedCash: 0,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    setPaymentDetails: (state, action: PayloadAction<{ method: PaymentMethod; receivedCash?: number }>) => {
      state.method = action.payload.method;
      state.receivedCash = action.payload.receivedCash ?? 0;
    },
    clearPaymentDetails: (state) => {
      state.method = "CASH";
      state.receivedCash = 0;
    },
  },
});

export const { setPaymentDetails, clearPaymentDetails } = paymentSlice.actions;
export default paymentSlice.reducer;
