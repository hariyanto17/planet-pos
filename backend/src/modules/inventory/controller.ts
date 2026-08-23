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
import { prisma } from "../../utils/prisma";
import { getSettings } from "../settings/service";

const resolveKitchenWarehouse = async () => {
  const settings = await getSettings();
  if (settings.kitchenWarehouseId) {
    const wh = await prisma.warehouse.findUnique({
      where: { id: settings.kitchenWarehouseId, isActive: true }
    });
    if (wh) return wh;
  }
  return prisma.warehouse.findFirst({
    where: { warehouseType: "KITCHEN_STORAGE", isDefaultKitchenStorage: true, isActive: true }
  });
};

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await inventoryService.getInventorySummary();
  return responseHandler.ok(res, summary);
});

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = productListQuerySchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  // Access Control
  if (req.user?.role === "WAREHOUSE") {
    const assignedWhId = req.user.warehouseId;
    if (!assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Pengguna gudang tidak memiliki penugasan gudang.");
    }
    if (!value.warehouseId) {
      value.warehouseId = assignedWhId;
    } else if (value.warehouseId !== assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda tidak memiliki izin untuk mengakses gudang ini.");
    }
  } else if (req.user?.role === "KITCHEN" || (req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY")) {
    const defaultKitchenWh = await resolveKitchenWarehouse();
    if (!defaultKitchenWh) {
      throw new AppError("BAD_REQUEST", "Penyimpanan dapur default tidak terkonfigurasi.");
    }
    if (!value.warehouseId) {
      value.warehouseId = defaultKitchenWh.id;
    } else if (value.warehouseId !== defaultKitchenWh.id) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Pengguna dapur hanya dapat mengakses Penyimpanan Dapur.");
    }
  }

  const products = await inventoryService.getProductStockList(value);
  return responseHandler.ok(res, products);
});

export const getMovements = catchAsync(async (req: Request, res: Response) => {
  const { error, value } = movementListQuerySchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  // Access Control
  if (req.user?.role === "WAREHOUSE") {
    const assignedWhId = req.user.warehouseId;
    if (!assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Pengguna gudang tidak memiliki penugasan gudang.");
    }
    if (!value.warehouseId) {
      value.warehouseId = assignedWhId;
    } else if (value.warehouseId !== assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda tidak memiliki izin untuk mengakses gudang ini.");
    }
  } else if (req.user?.role === "KITCHEN" || (req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY")) {
    const defaultKitchenWh = await resolveKitchenWarehouse();
    if (!defaultKitchenWh) {
      throw new AppError("BAD_REQUEST", "Penyimpanan dapur default tidak terkonfigurasi.");
    }
    if (!value.warehouseId) {
      value.warehouseId = defaultKitchenWh.id;
    } else if (value.warehouseId !== defaultKitchenWh.id) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Pengguna dapur hanya dapat mengakses Penyimpanan Dapur.");
    }
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

  // Access Control
  if (req.user?.role === "WAREHOUSE") {
    const assignedWhId = req.user.warehouseId;
    if (!assignedWhId || value.warehouseId !== assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda tidak memiliki izin untuk mengoperasikan gudang ini.");
    }
  } else if (req.user?.role === "KITCHEN" || (req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY")) {
    const defaultKitchenWh = await resolveKitchenWarehouse();
    if (!defaultKitchenWh || value.warehouseId !== defaultKitchenWh.id) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Staf dapur hanya dapat mengubah stok Penyimpanan Dapur.");
    }
  }

  const result = await inventoryService.createStockReceipt(userId, value);
  return responseHandler.ok(res, result, "Stock received successfully");
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

  // Access Control
  if (req.user?.role === "WAREHOUSE") {
    const assignedWhId = req.user.warehouseId;
    if (!assignedWhId || value.warehouseId !== assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda tidak memiliki izin untuk mengoperasikan gudang ini.");
    }
  } else if (req.user?.role === "KITCHEN" || (req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY")) {
    const defaultKitchenWh = await resolveKitchenWarehouse();
    if (!defaultKitchenWh || value.warehouseId !== defaultKitchenWh.id) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Staf dapur hanya dapat mengubah stok Penyimpanan Dapur.");
    }
  }

  const result = await inventoryService.adjustStock(userId, value);
  return responseHandler.ok(res, result, "Stock adjusted successfully");
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

  // Access Control
  if (req.user?.role === "WAREHOUSE") {
    const assignedWhId = req.user.warehouseId;
    if (!assignedWhId || value.warehouseId !== assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda tidak memiliki izin untuk mengoperasikan gudang ini.");
    }
  } else if (req.user?.role === "KITCHEN" || (req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY")) {
    const defaultKitchenWh = await resolveKitchenWarehouse();
    if (!defaultKitchenWh || value.warehouseId !== defaultKitchenWh.id) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Staf dapur hanya dapat mengubah stok Penyimpanan Dapur.");
    }
  }

  const result = await inventoryService.removeAsWaste(userId, value);
  return responseHandler.ok(res, result, "Waste recorded successfully");
});

export const getWarehouses = catchAsync(async (req: Request, res: Response) => {
  const warehouses = await inventoryService.getActiveWarehouses();
  return responseHandler.ok(res, warehouses);
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

  // Access Control
  if (req.user?.role === "WAREHOUSE") {
    const assignedWhId = req.user.warehouseId;
    if (!assignedWhId || value.warehouseId !== assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda tidak memiliki izin untuk mengoperasikan gudang ini.");
    }
  } else if (req.user?.role === "KITCHEN" || (req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY")) {
    const defaultKitchenWh = await resolveKitchenWarehouse();
    if (!defaultKitchenWh || value.warehouseId !== defaultKitchenWh.id) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Staf dapur hanya dapat mengubah stok Penyimpanan Dapur.");
    }
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

  // Access Control
  if (req.user?.role === "WAREHOUSE") {
    const assignedWhId = req.user.warehouseId;
    if (!assignedWhId || value.sourceWarehouseId !== assignedWhId) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda hanya dapat membuat transfer dari gudang penugasan Anda.");
    }
  } else if (req.user?.role === "KITCHEN" || (req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY")) {
    const defaultKitchenWh = await resolveKitchenWarehouse();
    if (!defaultKitchenWh) {
      throw new AppError("BAD_REQUEST", "Penyimpanan dapur default tidak terkonfigurasi.");
    }
    if (value.destinationWarehouseId !== defaultKitchenWh.id) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Gudang tujuan harus berupa Penyimpanan Dapur.");
    }
  }

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

  // Access Control
  const isWarehouse = req.user?.role === "WAREHOUSE";
  const isKitchen = req.user?.role === "KITCHEN";
  const isCashierInCashierOnly = req.user?.role === "CASHIER" && (await getSettings()).appType === "CASHIER_ONLY";

  if (isWarehouse || isKitchen || isCashierInCashierOnly) {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { destinationWarehouse: true }
    });
    if (!transfer) {
      throw new AppError("NOT_FOUND", "Stock transfer not found");
    }

    if (isWarehouse) {
      const assignedWhId = req.user?.warehouseId;
      if (!assignedWhId || transfer.destinationWarehouseId !== assignedWhId) {
        throw new AppError("FORBIDDEN", "Akses ditolak: Anda hanya dapat menyelesaikan transfer ke gudang penugasan Anda.");
      }
    } else if (isKitchen || isCashierInCashierOnly) {
      if (transfer.destinationWarehouse.warehouseType !== "KITCHEN_STORAGE") {
        throw new AppError("FORBIDDEN", "Akses ditolak: Anda hanya dapat menyelesaikan transfer ke Penyimpanan Dapur.");
      }
      const defaultKitchenWh = await resolveKitchenWarehouse();
      if (!defaultKitchenWh || transfer.destinationWarehouseId !== defaultKitchenWh.id) {
        throw new AppError("FORBIDDEN", "Akses ditolak: Anda hanya dapat menyelesaikan transfer ke Penyimpanan Dapur default.");
      }
    }
  }

  const result = await inventoryService.completeStockTransfer(userId, id);
  return responseHandler.ok(res, result, "Stock transfer completed");
});

export const getStockTransfersHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const userWarehouseId = req.user?.warehouseId;

  if (!userId || !userRole) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const transfers = await inventoryService.getStockTransfers(userId, userRole, userWarehouseId || null);
  return responseHandler.ok(res, transfers, "Stock transfers retrieved successfully");
});
