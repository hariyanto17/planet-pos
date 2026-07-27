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
