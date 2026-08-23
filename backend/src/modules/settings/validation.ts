import Joi from "joi";
import { AppType } from "@shared/types";

export const updateSettingsSchema = Joi.object({
  appName: Joi.string().min(1).optional(),
  appType: Joi.string().valid(AppType.SELF_ORDER, AppType.CASHIER_ONLY).optional(),
  timezone: Joi.string().min(1).optional(),
  locale: Joi.string().min(1).optional(),
  currency: Joi.string().min(1).optional(),
  businessDayStartTime: Joi.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  defaultWarehouseId: Joi.string().allow(null, "").optional(),
  kitchenWarehouseId: Joi.string().allow(null, "").optional(),
});
