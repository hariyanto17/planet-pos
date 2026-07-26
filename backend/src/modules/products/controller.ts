import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as productService from "./service";
import { createProductSchema, updateProductSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getProducts = async (req: Request, res: Response) => {
  const products = await productService.getAllProducts();
  return responseHandler.ok(res, products);
};

export const getProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await productService.getProductById(id);
  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found");
  }
  return responseHandler.ok(res, product);
};

export const createProductHandler = async (req: Request, res: Response) => {
  const { error, value } = createProductSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const product = await productService.createProduct(value);
  
  if (req.user) {
    await logActivity(req.user.id, "CREATE", "Product", product.id, product);
  }
  
  return responseHandler.created(res, product);
};

export const updateProductHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateProductSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const existing = await productService.getProductById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Product not found");
  }
  
  const product = await productService.updateProduct(id, value);
  
  if (req.user) {
    await logActivity(req.user.id, "UPDATE", "Product", product.id, product);
  }
  
  return responseHandler.ok(res, product);
};

export const deleteProductHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await productService.getProductById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Product not found");
  }
  
  await productService.deleteProduct(id);
  
  if (req.user) {
    await logActivity(req.user.id, "DELETE", "Product", id);
  }
  
  return responseHandler.ok(res, null, "Product deleted successfully");
};
