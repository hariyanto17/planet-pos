import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as paymentService from "./service";
import { createPaymentSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getOrderPayments = async (req: Request, res: Response) => {
  const { orderId } = req.query;
  if (!orderId || typeof orderId !== "string") {
    throw new AppError("BAD_REQUEST", "orderId query parameter is required");
  }

  const payments = await paymentService.getPaymentsByOrderId(orderId);
  return responseHandler.ok(res, payments);
};

export const createPaymentHandler = async (req: Request, res: Response) => {
  const { error, value } = createPaymentSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const cashierId = req.user ? req.user.id : null;
  const payment = await paymentService.createPayment(cashierId, value);

  if (cashierId) {
    await logActivity(cashierId, "CREATE", "Payment", payment.id, payment);
  }

  return responseHandler.created(res, payment);
};

export const confirmPaymentHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const payment = await paymentService.confirmPendingPayment(id, req.user.id, req.body);
  await logActivity(req.user.id, "UPDATE", "Payment", payment.id, payment);

  return responseHandler.ok(res, payment);
};
