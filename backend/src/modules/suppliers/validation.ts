import Joi from "joi";

export const createSupplierSchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().allow(null, "").optional(),
  isActive: Joi.boolean().default(true),
});
