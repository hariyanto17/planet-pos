import { baseApi } from "./baseApi";
import { PaymentMethod, OrderType } from "@shared/types";

export interface CheckoutPayload {
  customerName: string;
  tableId?: string;
  orderType: OrderType;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
  estimatedCash?: number;
}

export interface CheckoutResult {
  orderId: string;
  displayNumber: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  grandTotal: number;
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
      invalidatesTags: ["Order", "Payment"],
    }),
  }),
});

export const { useCheckoutMutation } = checkoutApi;
