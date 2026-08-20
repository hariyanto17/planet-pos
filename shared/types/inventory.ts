import { StockRequestStatus, StockTransferStatus, StockMovementType } from "../constants/inventory";

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  warehouseType: "CENTRAL_WAREHOUSE" | "OUTLET_STORAGE" | "KITCHEN_STORAGE" | "TRANSIT";
  isDefaultKitchenStorage: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialVariant {
  id: string;
  name: string;
  sku: string | null;
  materialId: string;
  quantityInBaseUnit: number | string;
  isActive: boolean;
  material?: {
    name: string;
  };
}

export interface InventoryStock {
  id: string;
  warehouseId: string;
  materialVariantId: string;
  quantity: number | string;
  createdAt: string;
  updatedAt: string;
  product?: MaterialVariant;
  warehouse?: Warehouse;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  materialVariantId: string;
  quantity: number | string;
  packagingVersionId: string | null;
  requestedQuantity: number | string | null;
  createdAt: string;
  materialVariant?: MaterialVariant;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  requestedById: string;
  sourceResponsibleUserId: string | null;
  destinationResponsibleUserId: string | null;
  completedById: string | null;
  completedAt: string | null;
  status: StockTransferStatus;
  remarks: string | null;
  items?: StockTransferItem[];
  stockRequestId: string | null;
  createdAt: string;
  updatedAt: string;
  sourceWarehouse?: { name: string };
  destinationWarehouse?: { name: string };
  requestedBy?: { fullName: string };
  completedBy?: { fullName: string };
}

export interface StockRequestItem {
  id: string;
  requestId: string;
  materialVariantId: string;
  quantity: number | string;
  packagingVersionId: string | null;
  requestedQuantity: number | string | null;
  createdAt: string;
  materialVariant?: MaterialVariant;
}

export interface StockRequestTimelineEvent {
  status: StockRequestStatus;
  timestamp: string;
  actor: string;
  warehouse?: string;
}

export interface StockRequest {
  id: string;
  requestNumber: string;
  requesterId: string;
  requestingWarehouseId: string;
  sourceWarehouseId: string | null;
  sourceUserId: string | null;
  status: StockRequestStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  acceptedAt: string | null;
  requester?: { fullName: string };
  requestingWarehouse?: { name: string };
  sourceWarehouse?: { name: string } | null;
  sourceUser?: { fullName: string } | null;
  items?: StockRequestItem[];
  stockTransfer?: StockTransfer | null;
  timeline?: StockRequestTimelineEvent[];
}

// API DTO Request Payloads
export interface CreateStockTransferRequest {
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

export interface CreateStockRequestRequest {
  requestingWarehouseId: string;
  items: Array<{
    materialVariantId: string;
    quantity: number;
    unit?: string;
  }>;
  notes?: string;
}
