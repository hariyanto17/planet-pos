import Joi from "joi";
import { PromotionType } from "@prisma/client";

const promotionItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
});

export const createPromotionSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid(PromotionType.PERCENT, PromotionType.PACKAGE).required(),
  percentValue: Joi.number().precision(2).min(0).max(100).optional(),
  packagePrice: Joi.number().precision(2).positive().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().greater(Joi.ref("startDate")).optional(),
  priority: Joi.number().integer().min(0).optional(),
  stackable: Joi.boolean().optional(),
  items: Joi.array().items(promotionItemSchema).min(1).optional(),
});

export const updatePromotionSchema = Joi.object({
  name: Joi.string().optional(),
  type: Joi.string().valid(PromotionType.PERCENT, PromotionType.PACKAGE).optional(),
  percentValue: Joi.number().precision(2).min(0).max(100).optional(),
  packagePrice: Joi.number().precision(2).positive().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().integer().min(0).optional(),
  stackable: Joi.boolean().optional(),
  items: Joi.array().items(promotionItemSchema).optional(),
});
