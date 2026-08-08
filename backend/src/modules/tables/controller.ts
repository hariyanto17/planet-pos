import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as tableService from "./service";
import { createTableSchema, updateTableSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";
import { buildSelfOrderUrl, generateQrCodeBuffer, createQrCodeZipStream } from "./qrService";

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

export const downloadSingleQrHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const table = await tableService.getTableById(id);
  if (!table) {
    throw new AppError("NOT_FOUND", "Table not found");
  }
  if (!table.isActive) {
    throw new AppError("BAD_REQUEST", "Tidak dapat membuat kode QR untuk meja nonaktif.");
  }

  const url = buildSelfOrderUrl(table.id);
  const buffer = await generateQrCodeBuffer(url);

  const safeCode = table.code.replace(/[^a-zA-Z0-9]/g, "_");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="table-${safeCode}-qr.png"`);
  return res.send(buffer);
};

export const downloadAllQrsHandler = async (req: Request, res: Response) => {
  const allTables = await tableService.getAllTables();
  const activeTables = allTables.filter((t) => t.isActive);

  if (activeTables.length === 0) {
    throw new AppError("BAD_REQUEST", "Tidak ada meja aktif untuk diunduh.");
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="concession-table-qrcodes.zip"');

  const zipStream = await createQrCodeZipStream(activeTables);
  zipStream.pipe(res);
};
