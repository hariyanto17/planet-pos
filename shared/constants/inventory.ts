export enum StockRequestStatus {
  PENDING = "PENDING",
  FULFILLING = "FULFILLING",
  SHIPPED = "SHIPPED",
  RECEIVED = "RECEIVED",
  ACCEPTED = "ACCEPTED",
  CANCELLED = "CANCELLED",
}

export enum StockTransferStatus {
  DRAFT = "DRAFT",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum StockMovementType {
  OPENING = "OPENING",
  RECEIVE = "RECEIVE",
  SALE = "SALE",
  ADJUSTMENT = "ADJUSTMENT",
  WASTE = "WASTE",
  TRANSFER_OUT = "TRANSFER_OUT",
  TRANSFER_IN = "TRANSFER_IN",
  RECIPE_CONSUMPTION = "RECIPE_CONSUMPTION",
}

export const BASE_UNITS = ["G", "ML", "PCS"] as const;
export type BaseUnit = typeof BASE_UNITS[number];
