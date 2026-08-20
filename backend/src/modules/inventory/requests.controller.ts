import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { AppError } from "../../utils/errorHandler";
import { responseHandler } from "../../utils/responeHandler";
import * as requestsService from "./requests.service";
import Joi from "joi";

const createRequestSchema = Joi.object({
  requestingWarehouseId: Joi.string().required(),
  notes: Joi.string().allow("").optional(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        variantId: Joi.string().required(),
        packagingId: Joi.string().allow(null, "").optional(),
        quantity: Joi.number().positive().required(),
        unit: Joi.string().allow(null, "").optional(),
      })
    )
    .min(1)
    .required(),
});

export const createStockRequest = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = createRequestSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const userId = req.user?.id;
  const userWarehouseId = req.user?.warehouseId || null;
  const userRole = req.user?.role || "";

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const request = await requestsService.createStockRequest(
    userId,
    userWarehouseId,
    userRole,
    value.requestingWarehouseId,
    value.items,
    value.notes
  );

  return responseHandler.created(res, request, "Stock request created successfully");
});

export const getStockRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userWarehouseId = req.user?.warehouseId || null;
  const userRole = req.user?.role || "";

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const scope = req.query.scope as string;
  const status = req.query.status as any;

  const requests = await requestsService.getStockRequests(userId, userRole, userWarehouseId, {
    scope,
    status,
  });

  return responseHandler.ok(res, requests, "Stock requests retrieved successfully");
});

export const claimStockRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sourceWarehouseId } = req.body;

  if (!sourceWarehouseId) {
    throw new AppError("BAD_REQUEST", "sourceWarehouseId is required");
  }

  const userId = req.user?.id;
  const userWarehouseId = req.user?.warehouseId || null;
  const userRole = req.user?.role || "";

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const request = await requestsService.claimStockRequest(
    userId,
    userWarehouseId,
    userRole,
    id,
    sourceWarehouseId
  );

  return responseHandler.ok(res, request, "Stock request claimed successfully");
});

export const shipStockRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const request = await requestsService.shipStockRequest(userId, id);
  return responseHandler.ok(res, request, "Stock request shipped successfully");
});

export const receiveStockRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userWarehouseId = req.user?.warehouseId || null;
  const userRole = req.user?.role || "";

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const request = await requestsService.receiveStockRequest(userId, userWarehouseId, userRole, id);
  return responseHandler.ok(res, request, "Stock request received successfully");
});

export const acceptStockRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userWarehouseId = req.user?.warehouseId || null;
  const userRole = req.user?.role || "";

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const request = await requestsService.acceptStockRequest(userId, userWarehouseId, userRole, id);
  return responseHandler.ok(res, request, "Stock request accepted successfully");
});

export const cancelStockRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userWarehouseId = req.user?.warehouseId || null;
  const userRole = req.user?.role || "";

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const request = await requestsService.cancelStockRequest(userId, userWarehouseId, userRole, id);
  return responseHandler.ok(res, request, "Stock request cancelled successfully");
});
