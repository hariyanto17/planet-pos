import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as taxService from "./service";
import { createTaxSchema, updateTaxSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getTaxes = async (req: Request, res: Response) => {
  const taxes = await taxService.getAllTaxes();
  return responseHandler.ok(res, taxes);
};

export const getTax = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tax = await taxService.getTaxById(id);
  if (!tax) {
    throw new AppError("NOT_FOUND", "Tax not found");
  }
  return responseHandler.ok(res, tax);
};

export const createTaxHandler = async (req: Request, res: Response) => {
  const { error, value } = createTaxSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const tax = await taxService.createTax(value);
  
  if (req.user) {
    await logActivity(req.user.id, "CREATE", "Tax", tax.id, tax);
  }
  
  return responseHandler.created(res, tax);
};

export const updateTaxHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateTaxSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const existing = await taxService.getTaxById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Tax not found");
  }
  
  const tax = await taxService.updateTax(id, value);
  
  if (req.user) {
    await logActivity(req.user.id, "UPDATE", "Tax", tax.id, tax);
  }
  
  return responseHandler.ok(res, tax);
};

export const deleteTaxHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await taxService.getTaxById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Tax not found");
  }
  
  await taxService.deleteTax(id);
  
  if (req.user) {
    await logActivity(req.user.id, "DELETE", "Tax", id);
  }
  
  return responseHandler.ok(res, null, "Tax deleted successfully");
};
