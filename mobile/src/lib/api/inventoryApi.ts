import { baseApi } from "./baseApi";

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventorySummary: builder.query<any, void>({
      query: () => "/inventory/summary",
      providesTags: ["Inventory"] as any,
    }),
    getInventoryProducts: builder.query<
      any,
      { search?: string; warehouseId?: string; stockStatus?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/inventory/products",
        params,
      }),
      providesTags: ["Inventory"] as any,
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
      providesTags: ["Inventory"] as any,
    }),
    receiveStock: builder.mutation<any, { productId: string; warehouseId: string; quantity: number; unit?: string; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/receive",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    adjustStock: builder.mutation<any, { productId: string; warehouseId: string; quantity: number; unit?: string; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/adjust",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    removeWaste: builder.mutation<any, { productId: string; warehouseId: string; quantity: number; unit?: string; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/waste",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    recordOpeningStock: builder.mutation<any, { warehouseId: string; items: Array<{ productId: string; quantity: number; unit?: string; remarks?: string }> }>({
      query: (body) => ({
        url: "/inventory/opening",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    transferStock: builder.mutation<any, { sourceWarehouseId: string; destinationWarehouseId: string; items: Array<{ productId: string; quantity: number; unit?: string }>; remarks?: string; sourceResponsibleUserId?: string | null; destinationResponsibleUserId?: string | null }>({
      query: (body) => ({
        url: "/inventory/transfer",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    getStockTransfers: builder.query<any[], void>({
      query: () => "/inventory/transfer",
      providesTags: ["Inventory"] as any,
    }),
    completeStockTransfer: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/transfer/${id}/complete`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    getWarehouses: builder.query<any[], void>({
      query: () => "/inventory/warehouses",
      providesTags: ["Inventory"] as any,
    }),
    getUnits: builder.query<any[], void>({
      query: () => "/inventory/units",
      providesTags: ["Inventory"] as any,
    }),
    getStockRequests: builder.query<any[], { scope?: string; status?: string }>({
      query: (params) => ({
        url: "/inventory/requests",
        params,
      }),
      providesTags: ["Inventory"] as any,
    }),
    createStockRequest: builder.mutation<any, { requestingWarehouseId: string; items: Array<{ productId: string; quantity: number; unit?: string }>; notes?: string }>({
      query: (body) => ({
        url: "/inventory/requests",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    claimStockRequest: builder.mutation<any, { id: string; sourceWarehouseId: string }>({
      query: ({ id, sourceWarehouseId }) => ({
        url: `/inventory/requests/${id}/claim`,
        method: "POST",
        body: { sourceWarehouseId },
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    shipStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/ship`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    receiveStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/receive`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    acceptStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"] as any,
    }),
    cancelStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"] as any,
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
  useGetStockTransfersQuery,
  useCompleteStockTransferMutation,
  useGetWarehousesQuery,
  useGetUnitsQuery,
  useGetStockRequestsQuery,
  useCreateStockRequestMutation,
  useClaimStockRequestMutation,
  useShipStockRequestMutation,
  useReceiveStockRequestMutation,
  useAcceptStockRequestMutation,
  useCancelStockRequestMutation,
} = inventoryApi;
export default inventoryApi;
