import { baseApi } from "./baseApi";

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventorySummary: builder.query<any, void>({
      query: () => "/inventory/summary",
      providesTags: ["Inventory"],
    }),
    getInventoryProducts: builder.query<
      any,
      { search?: string; warehouseId?: string; stockStatus?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/inventory/products",
        params,
      }),
      providesTags: ["Inventory"],
    }),
    getStockMovements: builder.query<
      any,
      {
        search?: string;
        warehouseId?: string;
        movementType?: string;
        productId?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: "/inventory/movements",
        params,
      }),
      providesTags: ["Inventory"],
    }),
    receiveStock: builder.mutation<any, { productId: string; warehouseId: string; quantity: number; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/receive",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    adjustStock: builder.mutation<any, { productId: string; warehouseId: string; quantity: number; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/adjust",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    removeWaste: builder.mutation<any, { productId: string; warehouseId: string; quantity: number; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/waste",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    recordOpeningStock: builder.mutation<any, { warehouseId: string; items: Array<{ productId: string; quantity: number; remarks?: string }> }>({
      query: (body) => ({
        url: "/inventory/opening",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    transferStock: builder.mutation<any, { sourceWarehouseId: string; destinationWarehouseId: string; items: Array<{ productId: string; quantity: number }>; remarks?: string; sourceResponsibleUserId?: string | null; destinationResponsibleUserId?: string | null }>({
      query: (body) => ({
        url: "/inventory/transfer",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    getWarehouses: builder.query<any[], void>({
      query: () => "/inventory/warehouses",
      providesTags: ["Inventory"],
    }),
    getUnits: builder.query<any[], void>({
      query: () => "/inventory/units",
      providesTags: ["Inventory"],
    }),
  }),
});

export const {
  useGetInventorySummaryQuery,
  useGetInventoryProductsQuery,
  useGetStockMovementsQuery,
  useReceiveStockMutation,
  useAdjustStockMutation,
  useRemoveWasteMutation,
  useRecordOpeningStockMutation,
  useTransferStockMutation,
  useGetWarehousesQuery,
  useGetUnitsQuery,
} = inventoryApi;
export default inventoryApi;
