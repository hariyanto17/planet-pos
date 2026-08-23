import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as orderService from "./service";
import { getAllOrdersPaginated } from "./pagination.service";
import { getKitchenQueue } from "./queue.service";
import { getSettings } from "../settings/service";

import { getPendingPayments } from "./pendingPayment.service";
import { createOrderSchema, updateOrderStatusSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getOrders = async (req: Request, res: Response) => {
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    paymentStatus: req.query.paymentStatus ? String(req.query.paymentStatus) : undefined,
    paymentMethod: req.query.paymentMethod ? String(req.query.paymentMethod) : undefined,
    source: req.query.source ? String(req.query.source) : undefined,
    startDate: req.query.startDate ? String(req.query.startDate) : undefined,
    endDate: req.query.endDate ? String(req.query.endDate) : undefined,
    businessDate: req.query.businessDate ? String(req.query.businessDate) : undefined,
    sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
    sortOrder: req.query.sortOrder === "asc" || req.query.sortOrder === "desc"
      ? (req.query.sortOrder as "asc" | "desc")
      : undefined,
  };

  const result = await getAllOrdersPaginated(options);
  return responseHandler.ok(res, result);
};

export const getOrdersQueue = async (req: Request, res: Response) => {
  const settings = await getSettings();
  if (settings.appType === "CASHIER_ONLY") {
    throw new AppError("FORBIDDEN", "KDS_DISABLED");
  }
  const queue = await getKitchenQueue();
  return responseHandler.ok(res, queue);
};

export const getPendingPaymentsHandler = async (req: Request, res: Response) => {
  const pending = await getPendingPayments();
  return responseHandler.ok(res, pending);
};

export const getOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await orderService.getOrderById(id);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found");
  }
  return responseHandler.ok(res, order);
};

export const createOrderHandler = async (req: Request, res: Response) => {
  const { error, value } = createOrderSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const cashierId = req.user ? req.user.id : null;
  const order = await orderService.createOrder(cashierId, value);

  if (cashierId) {
    await logActivity(cashierId, "CREATE", "Order", order.id, order);
  }

  return responseHandler.created(res, order);
};

export const updateOrderStatusHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateOrderStatusSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const existing = await orderService.getOrderById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Order not found");
  }

  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const order = await orderService.updateOrderStatus(id, value.status, req.user.id);

  await logActivity(req.user.id, "UPDATE_STATUS", "Order", id, { status: value.status });

  return responseHandler.ok(res, order);
};
