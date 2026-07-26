import Joi from "joi";

export const openShiftSchema = Joi.object({
  openingCash: Joi.number().min(0).required(),
});

export const closeShiftSchema = Joi.object({
  actualCash: Joi.number().min(0).required(),
  notes: Joi.string().allow("").optional(),
});
