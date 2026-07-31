import Joi from "joi";

export const receiveStockSchema = Joi.object({
  productId: Joi.string().required(),
  warehouseId: Joi.string().required(),
  quantity: Joi.number().precision(3).positive().required(),
  remarks: Joi.string().allow("", null).optional(),
});

export const adjustStockSchema = Joi.object({
  productId: Joi.string().required(),
  warehouseId: Joi.string().required(),
  quantity: Joi.number().precision(3).invalid(0).required(), // Can be positive or negative, but not zero
  remarks: Joi.string().allow("", null).optional(),
});

export const removeAsWasteSchema = Joi.object({
  productId: Joi.string().required(),
  warehouseId: Joi.string().required(),
  quantity: Joi.number().precision(3).positive().required(),
  remarks: Joi.string().allow("", null).optional(),
});

export const productListQuerySchema = Joi.object({
  search: Joi.string().allow("", null).optional(),
  warehouseId: Joi.string().allow("", null).optional(),
  stockStatus: Joi.string().valid("IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const movementListQuerySchema = Joi.object({
  search: Joi.string().allow("", null).optional(),
  warehouseId: Joi.string().allow("", null).optional(),
  movementType: Joi.string().valid("OPENING", "RECEIVE", "SALE", "ADJUSTMENT", "WASTE").optional(),
  productId: Joi.string().allow("", null).optional(),
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const openingStockItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().precision(3).positive().required(),
  remarks: Joi.string().allow("", null).optional(),
});

export const recordOpeningStockSchema = Joi.object({
  warehouseId: Joi.string().required(),
  items: Joi.array().items(openingStockItemSchema).min(1).required(),
});

export const stockTransferItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().precision(3).positive().required(),
});

export const createStockTransferSchema = Joi.object({
  sourceWarehouseId: Joi.string().required(),
  destinationWarehouseId: Joi.string().required(),
  items: Joi.array().items(stockTransferItemSchema).min(1).required(),
  remarks: Joi.string().allow("", null).optional(),
  sourceResponsibleUserId: Joi.string().allow(null, ""),
  destinationResponsibleUserId: Joi.string().allow(null, ""),
}).custom((value, helpers) => {
  if (value.sourceWarehouseId && value.destinationWarehouseId && value.sourceWarehouseId === value.destinationWarehouseId) {
    return helpers.error("any.invalid");
  }
  return value;
});

export const completeStockTransferSchema = Joi.object({
  // No body required for complete; kept for future extension
});
