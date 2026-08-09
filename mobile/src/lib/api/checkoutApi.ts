import { baseApi } from "./baseApi";
import { PaymentMethod, OrderType } from "@shared/types";

export interface CheckoutPayload {
  source: "CASHIER";
  customerName?: string;
  tableId?: string | null;
  orderType: OrderType;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    note?: string;
  }[];
  paymentMethod: PaymentMethod;
  receivedCash?: number;
}

export interface CheckoutResult {
  orderId: string;
  displayNumber: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  grandTotal: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
}

export const checkoutApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    checkout: builder.mutation<CheckoutResult, CheckoutPayload>({
      query: (body) => ({
        url: "/checkout",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Order", "Payment", "Product"],
    }),
  }),
});

export const { useCheckoutMutation } = checkoutApi;
