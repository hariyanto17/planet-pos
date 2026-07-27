import Joi from "joi";

export const createWarehouseSchema = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
});

export const updateWarehouseSchema = Joi.object({
  code: Joi.string().optional(),
  name: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});

export const warehouseListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow("", null).optional(),
  sortBy: Joi.string().valid("code", "name", "createdAt").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
