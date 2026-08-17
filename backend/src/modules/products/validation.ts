import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  sku: Joi.string().allow(null, "").optional(),
  barcode: Joi.string().allow(null, "").optional(),
  categoryId: Joi.string().allow(null, "").optional(),
  brandId: Joi.string().allow(null, "").optional(),
  productType: Joi.string().valid("DIRECT_SALE", "RECIPE_BASED").default("DIRECT_SALE").required(),
  price: Joi.number().precision(2).positive().allow(null).required(),
  directSaleMaterialVariantId: Joi.string().allow(null, "").optional(),
  isActive: Joi.boolean().default(true).optional(),
  recipe: Joi.object({
    items: Joi.array().items(Joi.object({
      materialId: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      note: Joi.string().allow(null, "").optional(),
    })).required(),
  }).optional(),
}).required();

export const updateProductSchema = Joi.object({
  name: Joi.string().optional(),
  sku: Joi.string().allow(null, "").optional(),
  barcode: Joi.string().allow(null, "").optional(),
  categoryId: Joi.string().allow(null, "").optional(),
  brandId: Joi.string().allow(null, "").optional(),
  productType: Joi.string().valid("DIRECT_SALE", "RECIPE_BASED").optional(),
  price: Joi.number().precision(2).positive().allow(null).optional(),
  directSaleMaterialVariantId: Joi.string().allow(null, "").optional(),
  isActive: Joi.boolean().optional(),
}).required();

export const upsertRecipeSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      materialId: Joi.string().required(),
      quantity: Joi.number().positive().precision(3).required(),
    }).unknown(false)
  ).required(),
}).required();
