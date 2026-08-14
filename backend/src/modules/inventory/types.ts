import { StockMovementType, StockReferenceType } from "@prisma/client";

export interface CreateLedgerEntryParams {
  materialVariantId: string;
  warehouseId: string;
  movementType: StockMovementType;
  quantity: number; // Signed: + for receipt, - for sale/waste/decrement
  referenceType: StockReferenceType;
  referenceId?: string | null;
  remarks?: string | null;
  createdById?: string | null;
}

export interface GetProductStockListFilters {
  search?: string;
  warehouseId?: string;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE_STOCK";
  page?: number;
  limit?: number;
}

export interface GetStockMovementsFilters {
  search?: string;
  warehouseId?: string;
  movementType?: StockMovementType;
  materialVariantId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ReceiveStockParams {
  materialVariantId: string;
  warehouseId: string;
  quantity: number; // positive only
  unit?: string;
  remarks?: string;
}

export interface AdjustStockParams {
  materialVariantId: string;
  warehouseId: string;
  quantity: number; // signed adjustment value: e.g. +10, -5
  unit?: string;
  remarks?: string;
}

export interface RemoveAsWasteParams {
  materialVariantId: string;
  warehouseId: string;
  quantity: number; // positive only (deduction is handled as negative quantity internally)
  unit?: string;
  remarks?: string;
}
