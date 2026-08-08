import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as categoryService from "./service";
import { createCategorySchema, updateCategorySchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getCategories = async (req: Request, res: Response) => {
  const sellableOnly = req.query.sellable === "true";
  const categories = await categoryService.getAllCategories(sellableOnly);
  return responseHandler.ok(res, categories);
};

export const getCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await categoryService.getCategoryById(id);
  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
  return responseHandler.ok(res, category);
};

export const createCategoryHandler = async (req: Request, res: Response) => {
  const { error, value } = createCategorySchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const category = await categoryService.createCategory(value);
  
  if (req.user) {
    await logActivity(req.user.id, "CREATE", "Category", category.id, category);
  }
  
  return responseHandler.created(res, category);
};

export const updateCategoryHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateCategorySchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const existing = await categoryService.getCategoryById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
  
  const category = await categoryService.updateCategory(id, value);
  
  if (req.user) {
    await logActivity(req.user.id, "UPDATE", "Category", category.id, category);
  }
  
  return responseHandler.ok(res, category);
};

export const deleteCategoryHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await categoryService.getCategoryById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
  
  await categoryService.deleteCategory(id);
  
  if (req.user) {
    await logActivity(req.user.id, "DELETE", "Category", id);
  }
  
  return responseHandler.ok(res, null, "Category deleted successfully");
};
