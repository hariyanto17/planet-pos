import { RootState } from "../../store";

export const selectPaymentMethod = (state: RootState) => state.payment.method;
export const selectPaymentReceivedCash = (state: RootState) => state.payment.receivedCash;
