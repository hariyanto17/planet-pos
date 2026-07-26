import Joi from "joi";
import { PaymentMethod } from "@prisma/client";

export const createPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  method: Joi.string().valid(PaymentMethod.CASH, PaymentMethod.QRIS).required(),
  amount: Joi.number().precision(2).positive().required(),
  estimatedCash: Joi.number().precision(2).positive().optional(),
  receivedCash: Joi.number().precision(2).positive().optional(),
  referenceNumber: Joi.string().allow(null, "").optional(),
});
