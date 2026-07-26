import Joi from "joi";

export const createTableSchema = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
});

export const updateTableSchema = Joi.object({
  code: Joi.string().optional(),
  name: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
