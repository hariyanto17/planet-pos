import Joi from "joi";
import { OrderType, OrderStatus } from "@prisma/client";

const orderItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
  note: Joi.string().allow(null, "").optional(),
});

export const createOrderSchema = Joi.object({
  customerName: Joi.string().required(),
  tableId: Joi.string().allow(null, "").optional(),
  orderType: Joi.string().valid(OrderType.DINE_IN, OrderType.TAKEAWAY).required(),
  notes: Joi.string().allow(null, "").optional(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      OrderStatus.NEW,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED
    )
    .required(),
});
