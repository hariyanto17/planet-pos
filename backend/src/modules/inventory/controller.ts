import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { responseHandler } from "../../utils/responeHandler";
import * as inventoryService from "./service";
import {
  productListQuerySchema,
  movementListQuerySchema,
  receiveStockSchema,
  adjustStockSchema,
  removeAsWasteSchema,
  recordOpeningStockSchema,
  createStockTransferSchema,
  completeStockTransferSchema,
} from "./validation";
import { AppError } from "../../utils/errorHandler";

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await inventoryService.getInventorySummary();
  return responseHandler.ok(res, summary);
});

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = productListQuerySchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const products = await inventoryService.getProductStockList(value);
  return responseHandler.ok(res, products);
});

export const getMovements = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = movementListQuerySchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const movements = await inventoryService.getStockMovements(value);
  return responseHandler.ok(res, movements);
});

export const receiveStock = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = receiveStockSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  const newBalance = await inventoryService.createStockReceipt(userId, value);
  return responseHandler.ok(res, { newBalance }, "Stock received successfully");
});

export const adjustStock = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = adjustStockSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  const newBalance = await inventoryService.adjustStock(userId, value);
  return responseHandler.ok(res, { newBalance }, "Stock adjusted successfully");
});

export const removeWaste = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = removeAsWasteSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  const newBalance = await inventoryService.removeAsWaste(userId, value);
  return responseHandler.ok(res, { newBalance }, "Waste recorded successfully");
});

export const getWarehouses = catchAsync(async (req: Request, res: Response) => {
  const warehouses = await inventoryService.getActiveWarehouses();
  return responseHandler.ok(res, warehouses);
});

export const getUnits = catchAsync(async (req: Request, res: Response) => {
  const units = await inventoryService.getActiveUnits();
  return responseHandler.ok(res, units);
});

export const recordOpening = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = recordOpeningStockSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  const result = await inventoryService.recordOpeningStock(userId, value);
  return responseHandler.created(res, result, "Opening stock recorded successfully");
});

export const createStockTransferHandler = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = createStockTransferSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const userId = req.user?.id;
  if (!userId) throw new AppError("UNAUTHORIZED", "Not authenticated");

  const transfer = await inventoryService.createStockTransfer(userId, value);
  return responseHandler.created(res, transfer, "Stock transfer created");
});

export const completeStockTransferHandler = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = completeStockTransferSchema.validate(req.body || {});
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const userId = req.user?.id;
  if (!userId) throw new AppError("UNAUTHORIZED", "Not authenticated");

  const result = await inventoryService.completeStockTransfer(userId, id);
  return responseHandler.ok(res, result, "Stock transfer completed");
});
