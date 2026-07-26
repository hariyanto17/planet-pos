import { baseApi } from "./baseApi";
import { CreateOrderInput, UpdateOrderStatusInput } from "@shared/types";

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<any, any>({
      query: (params) => ({
        url: "/orders",
        params: params || {},
      }),
      providesTags: ["Order"],
    }),
    getOrdersQueue: builder.query<any[], void>({
      query: () => "/orders/queue",
      providesTags: ["Order"],
    }),
    getPendingPayments: builder.query<any[], void>({
      query: () => "/orders/pending-payment",
      providesTags: ["Order"],
    }),
    getOrder: builder.query<any, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),
    createOrder: builder.mutation<any, CreateOrderInput>({
      query: (body) => ({
        url: "/orders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Order"],
    }),
    updateOrderStatus: builder.mutation<any, { id: string; body: UpdateOrderStatusInput }>({
      query: ({ id, body }) => ({
        url: `/orders/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Order", { type: "Order", id }],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrdersQueueQuery,
  useGetPendingPaymentsQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
} = orderApi;
