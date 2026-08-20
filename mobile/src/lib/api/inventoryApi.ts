import { baseApi } from "./baseApi";
import { inventoryEndpointsConfig } from "../../../../shared/api/inventoryApi";

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventorySummary: builder.query<any, void>(inventoryEndpointsConfig.getInventorySummary),
    getInventoryProducts: builder.query<
      any,
      { search?: string; warehouseId?: string; stockStatus?: string; page?: number; limit?: number }
    >(inventoryEndpointsConfig.getInventoryProducts),
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
    >(inventoryEndpointsConfig.getStockMovements),
    receiveStock: builder.mutation<
      any,
      { productId: string; variantId: string; packagingId?: string; warehouseId: string; quantity: number; receivedUnit?: string; note?: string }
    >(inventoryEndpointsConfig.receiveStock),
    adjustStock: builder.mutation<
      any,
      { materialVariantId: string; warehouseId: string; quantity: number; unit?: string; remarks?: string }
    >(inventoryEndpointsConfig.adjustStock),
    removeWaste: builder.mutation<
      any,
      { materialVariantId: string; warehouseId: string; quantity: number; unit?: string; remarks?: string }
    >(inventoryEndpointsConfig.removeWaste),
    recordOpeningStock: builder.mutation<
      any,
      { warehouseId: string; items: Array<{ materialVariantId: string; quantity: number; unit?: string; remarks?: string }> }
    >(inventoryEndpointsConfig.recordOpeningStock),
    transferStock: builder.mutation<
      any,
      {
        productId: string;
        variantId: string;
        packagingId?: string;
        sourceWarehouseId: string;
        destinationWarehouseId: string;
        quantity: number;
        notes?: string;
        sourceResponsibleUserId?: string | null;
        destinationResponsibleUserId?: string | null;
      }
    >(inventoryEndpointsConfig.transferStock),
    getStockTransfers: builder.query<any[], void>(inventoryEndpointsConfig.getStockTransfers),
    completeStockTransfer: builder.mutation<any, string>(inventoryEndpointsConfig.completeStockTransfer),
    getWarehouses: builder.query<any[], void>(inventoryEndpointsConfig.getWarehouses),
    getUnits: builder.query<any[], void>(inventoryEndpointsConfig.getUnits),
    getStockRequests: builder.query<any[], { scope?: string; status?: string }>(inventoryEndpointsConfig.getStockRequests),
    createStockRequest: builder.mutation<
      any,
      {
        requestingWarehouseId: string;
        items: Array<{
          productId: string;
          variantId: string;
          packagingId?: string;
          quantity: number;
        }>;
        notes?: string;
      }
    >(inventoryEndpointsConfig.createStockRequest),
    claimStockRequest: builder.mutation<any, { id: string; sourceWarehouseId: string }>(inventoryEndpointsConfig.claimStockRequest),
    shipStockRequest: builder.mutation<any, string>(inventoryEndpointsConfig.shipStockRequest),
    receiveStockRequest: builder.mutation<any, string>(inventoryEndpointsConfig.receiveStockRequest),
    acceptStockRequest: builder.mutation<any, string>(inventoryEndpointsConfig.acceptStockRequest),
    cancelStockRequest: builder.mutation<any, string>(inventoryEndpointsConfig.cancelStockRequest),
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
