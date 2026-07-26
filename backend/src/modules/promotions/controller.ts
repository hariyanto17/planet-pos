import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as promotionService from "./service";
import { createPromotionSchema, updatePromotionSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getPromotions = async (req: Request, res: Response) => {
  const promotions = await promotionService.getAllPromotions();
  return responseHandler.ok(res, promotions);
};

export const getPromotion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const promotion = await promotionService.getPromotionById(id);
  if (!promotion) {
    throw new AppError("NOT_FOUND", "Promotion not found");
  }
  return responseHandler.ok(res, promotion);
};

export const createPromotionHandler = async (req: Request, res: Response) => {
  const { error, value } = createPromotionSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const promotion = await promotionService.createPromotion(req.user.id, value);
  
  await logActivity(req.user.id, "CREATE", "Promotion", promotion!.id, promotion);
  
  return responseHandler.created(res, promotion);
};

export const updatePromotionHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updatePromotionSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const existing = await promotionService.getPromotionById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Promotion not found");
  }
  
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const promotion = await promotionService.updatePromotion(id, value);
  
  await logActivity(req.user.id, "UPDATE", "Promotion", id, promotion);
  
  return responseHandler.ok(res, promotion);
};

export const deletePromotionHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await promotionService.getPromotionById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Promotion not found");
  }
  
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  await promotionService.deletePromotion(id);
  
  await logActivity(req.user.id, "DELETE", "Promotion", id);
  
  return responseHandler.ok(res, null, "Promotion deleted successfully");
};
