import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as shiftsService from "./service";
import { openShiftSchema, closeShiftSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";

export const openShiftHandler = async (req: Request, res: Response) => {
  const { error } = openShiftSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await shiftsService.openShift(req.user!.id, req.body.openingCash);
  return responseHandler.ok(res, result);
};

export const getCurrentShiftHandler = async (req: Request, res: Response) => {
  const result = await shiftsService.getCurrentShift(req.user!.id);
  return responseHandler.ok(res, result);
};

export const getShiftReconciliationHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    throw new AppError("BAD_REQUEST", "Shift ID parameter is required");
  }

  const result = await shiftsService.getShiftReconciliation(id);
  return responseHandler.ok(res, result);
};

export const closeShiftHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    throw new AppError("BAD_REQUEST", "Shift ID parameter is required");
  }

  const { error } = closeShiftSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await shiftsService.closeShift(id, req.body.actualCash, req.body.notes);
  return responseHandler.ok(res, result);
};
