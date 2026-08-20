export const inventoryEndpointsConfig = {
  getInventorySummary: {
    query: () => "/inventory/summary",
    providesTags: ["Inventory"] as any,
  },
  getInventoryProducts: {
    query: (params: any) => ({
      url: "/inventory/products",
      params,
    }),
    providesTags: ["Inventory"] as any,
  },
  getStockMovements: {
    query: (params: any) => ({
      url: "/inventory/movements",
      params,
    }),
    providesTags: ["Inventory"] as any,
  },
  receiveStock: {
    query: (body: any) => ({
      url: "/inventory/receive",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  adjustStock: {
    query: (body: any) => ({
      url: "/inventory/adjust",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  removeWaste: {
    query: (body: any) => ({
      url: "/inventory/waste",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  recordOpeningStock: {
    query: (body: any) => ({
      url: "/inventory/opening",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  transferStock: {
    query: (body: any) => ({
      url: "/inventory/transfer",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  getStockTransfers: {
    query: () => "/inventory/transfer",
    providesTags: ["Inventory"] as any,
  },
  completeStockTransfer: {
    query: (id: string) => ({
      url: `/inventory/transfer/${id}/complete`,
      method: "POST",
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  getWarehouses: {
    query: () => "/inventory/warehouses",
    providesTags: ["Inventory"] as any,
  },
  getUnits: {
    query: () => "/inventory/units",
    providesTags: ["Inventory"] as any,
  },
  getStockRequests: {
    query: (params: any) => ({
      url: "/inventory/requests",
      params,
    }),
    providesTags: ["Inventory"] as any,
  },
  createStockRequest: {
    query: (body: any) => ({
      url: "/inventory/requests",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  claimStockRequest: {
    query: ({ id, sourceWarehouseId }: any) => ({
      url: `/inventory/requests/${id}/claim`,
      method: "POST",
      body: { sourceWarehouseId },
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  shipStockRequest: {
    query: (id: string) => ({
      url: `/inventory/requests/${id}/ship`,
      method: "POST",
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  receiveStockRequest: {
    query: (id: string) => ({
      url: `/inventory/requests/${id}/receive`,
      method: "POST",
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  acceptStockRequest: {
    query: (id: string) => ({
      url: `/inventory/requests/${id}/accept`,
      method: "POST",
    }),
    invalidatesTags: ["Inventory"] as any,
  },
  cancelStockRequest: {
    query: (id: string) => ({
      url: `/inventory/requests/${id}/cancel`,
      method: "POST",
    }),
    invalidatesTags: ["Inventory"] as any,
  },
};
