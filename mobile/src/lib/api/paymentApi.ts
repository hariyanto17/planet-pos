import { baseApi } from "./baseApi";
import { CreatePaymentInput } from "@shared/types";

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query<any[], { orderId: string }>({
      query: (params) => ({
        url: "/payments",
        params,
      }),
      providesTags: ["Payment"],
    }),
    createPayment: builder.mutation<any, CreatePaymentInput>({
      query: (body) => ({
        url: "/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payment", "Order"],
    }),
    confirmPayment: builder.mutation<any, { id: string; body: { receivedCash?: number; referenceNumber?: string } }>({
      query: ({ id, body }) => ({
        url: `/payments/${id}/confirm`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Payment", "Order"],
    }),
  }),
});

export const { useGetPaymentsQuery, useCreatePaymentMutation, useConfirmPaymentMutation } = paymentApi;
