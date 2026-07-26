import Joi from "joi";

export const reportQuerySchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
});

export const productReportQuerySchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  categoryId: Joi.string().optional(),
});

export const shiftsReportQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  cashierId: Joi.string().optional(),
  shiftStatus: Joi.string().valid("OPEN", "CLOSED").optional(),
  differenceStatus: Joi.string().valid("ALL", "BALANCED", "DISCREPANCY").optional(),
  sortBy: Joi.string().valid("openedAt", "closedAt", "businessDate", "openingCash", "actualCash", "expectedCash", "difference").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});
