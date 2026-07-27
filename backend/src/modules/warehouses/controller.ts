import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as warehouseService from "./service";
import { createWarehouseSchema, updateWarehouseSchema, warehouseListQuerySchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getWarehouses = async (req: Request, res: Response) => {
  const { error, value } = warehouseListQuerySchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const result = await warehouseService.getWarehousesList(value);
  return responseHandler.ok(res, result);
};

export const getWarehouse = async (req: Request, res: Response) => {
  const { id } = req.params;
  const warehouse = await warehouseService.getWarehouseById(id);
  if (!warehouse) {
    throw new AppError("NOT_FOUND", "Warehouse not found");
  }
  return responseHandler.ok(res, warehouse);
};

export const createWarehouseHandler = async (req: Request, res: Response) => {
  const { error, value } = createWarehouseSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const warehouse = await warehouseService.createWarehouse(value);

  if (req.user) {
    await logActivity(req.user.id, "CREATE", "Warehouse", warehouse.id, warehouse);
  }

  return responseHandler.created(res, warehouse);
};

export const updateWarehouseHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateWarehouseSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const warehouse = await warehouseService.updateWarehouse(id, value);

  if (req.user) {
    await logActivity(req.user.id, "UPDATE", "Warehouse", warehouse.id, warehouse);
  }

  return responseHandler.ok(res, warehouse);
};

export const deactivateWarehouseHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  await warehouseService.deactivateWarehouse(id);

  if (req.user) {
    await logActivity(req.user.id, "DELETE", "Warehouse", id);
  }

  return responseHandler.ok(res, null, "Warehouse deactivated successfully");
};
