import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().required(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
