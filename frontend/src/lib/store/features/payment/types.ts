import { PaymentMethod } from "@shared/types";

export interface PaymentState {
  method: PaymentMethod;
  receivedCash: number;
}
