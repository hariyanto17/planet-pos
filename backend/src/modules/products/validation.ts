import Joi from "joi";

export const createProductSchema = Joi.object({
  categoryId: Joi.string().required(),
  sku: Joi.string().allow(null, "").optional(),
  name: Joi.string().required(),
  imageUrl: Joi.string().uri().allow(null, "").optional(),
  price: Joi.number().precision(2).positive().required(),
});

export const updateProductSchema = Joi.object({
  categoryId: Joi.string().optional(),
  sku: Joi.string().allow(null, "").optional(),
  name: Joi.string().optional(),
  imageUrl: Joi.string().uri().allow(null, "").optional(),
  price: Joi.number().precision(2).positive().optional(),
  isActive: Joi.boolean().optional(),
});
