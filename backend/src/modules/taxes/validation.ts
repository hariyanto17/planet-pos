import Joi from "joi";

export const createTaxSchema = Joi.object({
  name: Joi.string().required(),
  percentage: Joi.number().precision(2).min(0).max(100).required(),
});

export const updateTaxSchema = Joi.object({
  name: Joi.string().optional(),
  percentage: Joi.number().precision(2).min(0).max(100).optional(),
  isActive: Joi.boolean().optional(),
});
