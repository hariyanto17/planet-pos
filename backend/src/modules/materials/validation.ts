import Joi from "joi";

export const createMaterialSchema = Joi.object({
  name: Joi.string().trim().required(),
  categoryId: Joi.string().required(),
  brandId: Joi.string().allow(null, "").optional(),
  baseUnit: Joi.string().valid("G", "ML", "PCS").required(),
  description: Joi.string().allow(null, "").optional(),
  variant: Joi.object({
    name: Joi.string().trim().required(),
    sku: Joi.string().allow(null, "").optional(),
    barcode: Joi.string().allow(null, "").optional(),
    quantityInBaseUnit: Joi.number().positive().required(),
    purchasePrice: Joi.number().positive().required(),
    supplierId: Joi.string().allow(null, "").optional(),
  }).optional(),
}).required();

export const updateMaterialSchema = Joi.object({
  name: Joi.string().trim().optional(),
  categoryId: Joi.string().optional(),
  brandId: Joi.string().allow(null, "").optional(),
  baseUnit: Joi.string().valid("G", "ML", "PCS").optional(),
  description: Joi.string().allow(null, "").optional(),
  isActive: Joi.boolean().optional(),
  variant: Joi.object({
    id: Joi.string().optional(),
    sku: Joi.string().allow(null, "").optional(),
    barcode: Joi.string().allow(null, "").optional(),
    quantityInBaseUnit: Joi.number().positive().optional(),
    purchasePrice: Joi.number().positive().optional(),
    supplierId: Joi.string().allow(null, "").optional(),
  }).optional(),
}).required();

export const createMaterialVariantSchema = Joi.object({
  name: Joi.string().trim().required(),
  sku: Joi.string().allow(null, "").optional(),
  barcode: Joi.string().allow(null, "").optional(),
  quantityInBaseUnit: Joi.number().positive().required(),
  purchasePrice: Joi.number().min(0).required(),
  supplierId: Joi.string().allow(null, "").optional(),
}).required();

export const updateMaterialVariantSchema = Joi.object({
  name: Joi.string().trim().optional(),
  sku: Joi.string().allow(null, "").optional(),
  barcode: Joi.string().allow(null, "").optional(),
  quantityInBaseUnit: Joi.number().positive().optional(),
  purchasePrice: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).required();

export const createSupplierOfferSchema = Joi.object({
  supplierId: Joi.string().required(),
  unitPrice: Joi.number().min(0).required(),
  currency: Joi.string().default("IDR").optional(),
  isActive: Joi.boolean().default(true).optional(),
}).required();

export const createPackagingConfigurationSchema = Joi.object({
  name: Joi.string().trim().required(),
  unitLabel: Joi.string().allow(null, "").optional(),
  conversionFactor: Joi.number().positive().required(),
}).required();

export const createPackagingVersionSchema = Joi.object({
  conversionFactor: Joi.number().positive().required(),
}).required();
