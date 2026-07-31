import { baseApi } from "./baseApi";

export const warehousesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWarehousesList: builder.query<
      any,
      { search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }
    >({
      query: (params) => ({
        url: "/warehouses",
        params,
      }),
      providesTags: ["Warehouse"],
    }),
    getWarehouse: builder.query<any, string>({
      query: (id) => `/warehouses/${id}`,
      providesTags: (result, error, id) => [{ type: "Warehouse", id }],
    }),
    createWarehouse: builder.mutation<any, { code: string; name: string; warehouseType?: string; isDefaultKitchenStorage?: boolean }>({
      query: (body) => ({
        url: "/warehouses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Warehouse", "Inventory"],
    }),
    updateWarehouse: builder.mutation<any, { id: string; body: { code?: string; name?: string; warehouseType?: string; isDefaultKitchenStorage?: boolean; isActive?: boolean } }>({
      query: ({ id, body }) => ({
        url: `/warehouses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Warehouse", { type: "Warehouse", id }, "Inventory"],
    }),
    deactivateWarehouse: builder.mutation<any, string>({
      query: (id) => ({
        url: `/warehouses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Warehouse", "Inventory"],
    }),
  }),
});

export const {
  useGetWarehousesListQuery,
  useGetWarehouseQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeactivateWarehouseMutation,
} = warehousesApi;
