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
        materialVariantId?: string;
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
    receiveStock: builder.mutation<any, { productId: string; variantId: string; packagingId?: string; warehouseId: string; quantity: number; receivedUnit?: string; note?: string }>({
      query: (body) => ({
        url: "/inventory/receive",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    adjustStock: builder.mutation<any, { materialVariantId: string; warehouseId: string; quantity: number; unit?: string; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/adjust",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    removeWaste: builder.mutation<any, { materialVariantId: string; warehouseId: string; quantity: number; unit?: string; remarks?: string }>({
      query: (body) => ({
        url: "/inventory/waste",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    recordOpeningStock: builder.mutation<any, { warehouseId: string; items: Array<{ materialVariantId: string; quantity: number; unit?: string; remarks?: string }> }>({
      query: (body) => ({
        url: "/inventory/opening",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    transferStock: builder.mutation<any, {
      sourceWarehouseId: string;
      destinationWarehouseId: string;
      productId: string;
      variantId: string;
      packagingId?: string;
      quantity: number;
      notes?: string;
      sourceResponsibleUserId?: string | null;
      destinationResponsibleUserId?: string | null;
    }>({
      query: (body) => ({
        url: "/inventory/transfers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    getStockTransfers: builder.query<any[], void>({
      query: () => "/inventory/transfer",
      providesTags: ["Inventory"],
    }),
    completeStockTransfer: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/transfer/${id}/complete`,
        method: "POST",
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
    getStockRequests: builder.query<any[], { scope?: string; status?: string }>({
      query: (params) => ({
        url: "/inventory/requests",
        params,
      }),
      providesTags: ["Inventory"],
    }),
    createStockRequest: builder.mutation<any, { requestingWarehouseId: string; items: Array<{ productId: string; variantId: string; packagingId?: string; quantity: number }>; notes?: string }>({
      query: (body) => ({
        url: "/inventory/requests",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    claimStockRequest: builder.mutation<any, { id: string; sourceWarehouseId: string }>({
      query: ({ id, sourceWarehouseId }) => ({
        url: `/inventory/requests/${id}/claim`,
        method: "POST",
        body: { sourceWarehouseId },
      }),
      invalidatesTags: ["Inventory"],
    }),
    shipStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/ship`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"],
    }),
    receiveStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/receive`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"],
    }),
    acceptStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"],
    }),
    cancelStockRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/inventory/requests/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"],
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
