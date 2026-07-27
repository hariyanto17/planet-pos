import Joi from "joi";

export const createUnitSchema = Joi.object({
  name: Joi.string().required(),
  symbol: Joi.string().required(),
});

export const updateUnitSchema = Joi.object({
  name: Joi.string().optional(),
  symbol: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});

export const unitListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow("", null).optional(),
  sortBy: Joi.string().valid("name", "symbol", "createdAt").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
