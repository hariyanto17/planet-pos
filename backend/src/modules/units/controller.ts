import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as unitService from "./service";
import { createUnitSchema, updateUnitSchema, unitListQuerySchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getUnits = async (req: Request, res: Response) => {
  const { error, value } = unitListQuerySchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const result = await unitService.getUnitsList(value);
  return responseHandler.ok(res, result);
};

export const getUnit = async (req: Request, res: Response) => {
  const { id } = req.params;
  const unit = await unitService.getUnitById(id);
  if (!unit) {
    throw new AppError("NOT_FOUND", "Unit not found");
  }
  return responseHandler.ok(res, unit);
};

export const createUnitHandler = async (req: Request, res: Response) => {
  const { error, value } = createUnitSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const unit = await unitService.createUnit(value);

  if (req.user) {
    await logActivity(req.user.id, "CREATE", "Unit", unit.id, unit);
  }

  return responseHandler.created(res, unit);
};

export const updateUnitHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateUnitSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const unit = await unitService.updateUnit(id, value);

  if (req.user) {
    await logActivity(req.user.id, "UPDATE", "Unit", unit.id, unit);
  }

  return responseHandler.ok(res, unit);
};

export const deactivateUnitHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  await unitService.deactivateUnit(id);

  if (req.user) {
    await logActivity(req.user.id, "DELETE", "Unit", id);
  }

  return responseHandler.ok(res, null, "Unit deactivated successfully");
};
