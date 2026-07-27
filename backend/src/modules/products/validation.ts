import Joi from "joi";

export const createProductSchema = Joi.object({
  categoryId: Joi.string().required(),
  sku: Joi.string().allow(null, "").optional(),
  name: Joi.string().required(),
  imageUrl: Joi.string().uri().allow(null, "").optional(),
  price: Joi.number().precision(2).positive().required(),
  trackInventory: Joi.boolean().default(false).optional(),
  inventoryType: Joi.string().valid("FINISHED_GOOD", "RAW_MATERIAL", "PACKAGING").when("trackInventory", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, ""),
  }),
  unitId: Joi.string().when("trackInventory", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, ""),
  }),
  minimumStock: Joi.number().min(0).default(0).optional(),
});

export const updateProductSchema = Joi.object({
  categoryId: Joi.string().optional(),
  sku: Joi.string().allow(null, "").optional(),
  name: Joi.string().optional(),
  imageUrl: Joi.string().uri().allow(null, "").optional(),
  price: Joi.number().precision(2).positive().optional(),
  isActive: Joi.boolean().optional(),
  trackInventory: Joi.boolean().optional(),
  inventoryType: Joi.string().valid("FINISHED_GOOD", "RAW_MATERIAL", "PACKAGING").when("trackInventory", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, ""),
  }),
  unitId: Joi.string().when("trackInventory", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, ""),
  }),
  minimumStock: Joi.number().min(0).optional(),
});
