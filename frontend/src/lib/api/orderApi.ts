import { baseApi } from "./baseApi";
import { CreateOrderInput, UpdateOrderStatusInput } from "@shared/types";

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<{ data: any[]; pagination: any }, any>({
      query: (params) => ({
        url: "/orders",
        params: params || {},
      }),
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
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
} = orderApi;
