import Joi from "joi";

export const createBrandSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  isActive: Joi.boolean().default(true).optional(),
}).required();
