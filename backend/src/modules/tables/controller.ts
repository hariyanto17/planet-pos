import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as tableService from "./service";
import { createTableSchema, updateTableSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getTables = async (req: Request, res: Response) => {
  const tables = await tableService.getAllTables();
  return responseHandler.ok(res, tables);
};

export const getTable = async (req: Request, res: Response) => {
  const { id } = req.params;
  const table = await tableService.getTableById(id);
  if (!table) {
    throw new AppError("NOT_FOUND", "Table not found");
  }
  return responseHandler.ok(res, table);
};

export const createTableHandler = async (req: Request, res: Response) => {
  const { error, value } = createTableSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const table = await tableService.createTable(value);
  
  if (req.user) {
    await logActivity(req.user.id, "CREATE", "Table", table.id, table);
  }
  
  return responseHandler.created(res, table);
};

export const updateTableHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateTableSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  
  const existing = await tableService.getTableById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Table not found");
  }
  
  const table = await tableService.updateTable(id, value);
  
  if (req.user) {
    await logActivity(req.user.id, "UPDATE", "Table", table.id, table);
  }
  
  return responseHandler.ok(res, table);
};

export const deleteTableHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await tableService.getTableById(id);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Table not found");
  }
  
  await tableService.deleteTable(id);
  
  if (req.user) {
    await logActivity(req.user.id, "DELETE", "Table", id);
  }
  
  return responseHandler.ok(res, null, "Table deleted successfully");
};
