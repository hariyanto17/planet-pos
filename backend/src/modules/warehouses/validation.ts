import Joi from "joi";

export const createWarehouseSchema = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
  warehouseType: Joi.string().valid("SALES", "KITCHEN_STORAGE", "GENERAL").default("SALES"),
  isDefaultKitchenStorage: Joi.boolean().default(false),
});

export const updateWarehouseSchema = Joi.object({
  code: Joi.string().optional(),
  name: Joi.string().optional(),
  warehouseType: Joi.string().valid("SALES", "KITCHEN_STORAGE", "GENERAL").optional(),
  isDefaultKitchenStorage: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

export const warehouseListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow("", null).optional(),
  sortBy: Joi.string().valid("code", "name", "createdAt").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
