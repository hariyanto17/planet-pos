import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, Prisma, StockMovementType, StockReferenceType } from "@prisma/client";
import { getInventoryStatus } from "@shared/types";
import { createLedgerEntry } from "./stock.service";
import { getCommittedStockMap } from "../products/service";
import { convertToBaseUnit } from "../../utils/units";
import {
  GetProductStockListFilters,
  GetStockMovementsFilters,
  ReceiveStockParams,
  AdjustStockParams,
  RemoveAsWasteParams,
} from "./types";
import { AppError } from "../../utils/errorHandler";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const DEFAULT_SALES_WAREHOUSE_CODE = process.env.DEFAULT_SALES_WAREHOUSE_CODE || "CONCESSION";

/**
 * Get inventory statistics summary for dashboard cards
 */
export const getInventorySummary = async () => {
  const materialVariants = await prisma.materialVariant.findMany({
    where: { isActive: true },
    include: {
      inventoryStocks: {
        include: {
          warehouse: true,
        },
      },
    },
  });

  const activeWarehouseStocks = await prisma.inventoryStock.findMany({
    where: {
      warehouse: { isActive: true },
    },
    select: {
      materialVariantId: true,
      quantity: true,
    },
  });

  const totalStockMap = new Map<string, number>();
  for (const stock of activeWarehouseStocks) {
    const current = totalStockMap.get(stock.materialVariantId) || 0;
    totalStockMap.set(stock.materialVariantId, current + Number(stock.quantity));
  }

  const committedMap = await getCommittedStockMap(prisma);

  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let totalValue = 0;

  for (const variant of materialVariants) {
    const physicalQty = totalStockMap.get(variant.id) || 0;
    totalValue += physicalQty * 0;

    const availableStock = Math.max(0, physicalQty - (committedMap.get(`mv:${variant.id}`) || 0));
    if (availableStock <= 0) {
      outOfStockProducts++;
    } else if (availableStock <= 0) {
      lowStockProducts++;
    }
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMovements = await prisma.stockLedger.count({
    where: {
      createdAt: { gte: startOfToday },
    },
  });

  return {
    totalProducts: materialVariants.length,
    trackedProducts: materialVariants.length,
    lowStockProducts,
    outOfStockProducts,
    todayMovements,
    inventoryValue: totalValue,
  };
};

/**
 * Get list of inventory variants with active warehouse stock snapshot values
 */
export const getProductStockList = async (filters: GetProductStockListFilters) => {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const skip = (page - 1) * limit;

  const isAllWarehouses = !filters.warehouseId || filters.warehouseId === "all";
  let mapped: any[] = [];

  if (isAllWarehouses) {
    const activeWarehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    if (activeWarehouses.length === 0) {
      return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }

    const allVariants = await prisma.materialVariant.findMany({
      where: { isActive: true },
      include: {
        inventoryStocks: {
          where: { warehouse: { isActive: true } },
          include: { warehouse: true },
        },
      },
      orderBy: { name: "asc" },
    });

    for (const variant of allVariants) {
      for (const wh of activeWarehouses) {
        const stock = variant.inventoryStocks.find((s) => s.warehouseId === wh.id);
        const quantity = stock ? Number(stock.quantity) : 0;
        mapped.push({
          id: variant.id,
          sku: variant.sku || "-",
          name: variant.name,
          trackInventory: true,
          inventoryType: "RAW_MATERIAL",
          unit: variant.baseUnit,
          baseUnit: variant.baseUnit,
          warehouseName: wh.name,
          warehouseId: wh.id,
          quantity,
          minimumStock: 0,
          status: quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        });
      }
    }
  } else {
    const targetWarehouse = await prisma.warehouse.findUnique({
      where: { id: filters.warehouseId },
    });

    if (!targetWarehouse || !targetWarehouse.isActive) {
      return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }

    const allVariants = await prisma.materialVariant.findMany({
      where: { isActive: true },
      include: {
        inventoryStocks: {
          where: { warehouseId: filters.warehouseId },
          include: { warehouse: true },
        },
      },
      orderBy: { name: "asc" },
    });

    mapped = allVariants.map((variant) => {
      const stock = variant.inventoryStocks[0];
      const quantity = stock ? Number(stock.quantity) : 0;
      return {
        id: variant.id,
        sku: variant.sku || "-",
        name: variant.name,
        trackInventory: true,
        inventoryType: "RAW_MATERIAL",
        unit: variant.baseUnit,
        baseUnit: variant.baseUnit,
        warehouseName: targetWarehouse.name,
        warehouseId: filters.warehouseId,
        quantity,
        minimumStock: 0,
        status: quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      };
    });
  }

  let filtered = mapped;
  if (filters.search) {
    const searchTerm = filters.search.trim().toLowerCase();
    filtered = mapped.filter((item) =>
      item.name.toLowerCase().includes(searchTerm) || item.sku.toLowerCase().includes(searchTerm)
    );
  }
  if (filters.stockStatus) {
    filtered = filtered.filter((item) => item.status === filters.stockStatus);
  }

  const total = filtered.length;
  const sliced = filtered.slice(skip, skip + limit);

  return {
    data: sliced,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Record stock replenishment (RECEIVE)
 */
export const createStockReceipt = async (userId: string, params: ReceiveStockParams) => {
  const materialVariant = await prisma.materialVariant.findUnique({ where: { id: params.materialVariantId } });
  if (!materialVariant) throw new AppError("NOT_FOUND", "Material variant not found");

  const unit = params.unit || (materialVariant.baseUnit === "G" ? "g" : materialVariant.baseUnit === "ML" ? "ml" : "pcs");

  let normalizedQuantity: any = null;
  const newBalance = await prisma.$transaction(async (tx) => {
    normalizedQuantity = await convertToBaseUnit(params.materialVariantId, params.quantity, unit, (materialVariant.baseUnit || "PCS") as any, tx);
    return await createLedgerEntry(tx, {
      materialVariantId: params.materialVariantId,
      warehouseId: params.warehouseId,
      movementType: StockMovementType.RECEIVE,
      quantity: normalizedQuantity.toNumber(),
      referenceType: StockReferenceType.RECEIVE,
      remarks: params.remarks,
      createdById: userId,
    });
  });

  return {
    newBalance: Number(newBalance),
    quantity: params.quantity,
    unit: params.unit || (materialVariant.baseUnit === "G" ? "g" : materialVariant.baseUnit === "ML" ? "ml" : "pcs"),
    normalizedQuantity: normalizedQuantity?.toNumber() ?? 0,
    normalizedUnit: materialVariant.baseUnit || "PCS"
  };
};

/**
 * Record stock correction (ADJUSTMENT)
 */
export const adjustStock = async (userId: string, params: AdjustStockParams) => {
  const materialVariant = await prisma.materialVariant.findUnique({ where: { id: params.materialVariantId } });
  if (!materialVariant) throw new AppError("NOT_FOUND", "Material variant not found");

  const unit = params.unit || (materialVariant.baseUnit === "G" ? "g" : materialVariant.baseUnit === "ML" ? "ml" : "pcs");

  let normalizedQuantity: any = null;
  const newBalance = await prisma.$transaction(async (tx) => {
    const quantity = await convertToBaseUnit(params.materialVariantId, Math.abs(params.quantity), unit, (materialVariant.baseUnit || "PCS") as any, tx);
    const signedQty = params.quantity < 0 ? quantity.negated() : quantity;
    normalizedQuantity = signedQty;
    return await createLedgerEntry(tx, {
      materialVariantId: params.materialVariantId,
      warehouseId: params.warehouseId,
      movementType: StockMovementType.ADJUSTMENT,
      quantity: signedQty.toNumber(),
      referenceType: StockReferenceType.ADJUSTMENT,
      remarks: params.remarks,
      createdById: userId,
    });
  });

  return {
    newBalance: Number(newBalance),
    quantity: params.quantity,
    unit: params.unit || (materialVariant.baseUnit === "G" ? "g" : materialVariant.baseUnit === "ML" ? "ml" : "pcs"),
    normalizedQuantity: normalizedQuantity?.toNumber() ?? 0,
    normalizedUnit: materialVariant.baseUnit || "PCS"
  };
};

/**
 * Record inventory wastage (WASTE)
 */
export const removeAsWaste = async (userId: string, params: RemoveAsWasteParams) => {
  const materialVariant = await prisma.materialVariant.findUnique({ where: { id: params.materialVariantId } });
  if (!materialVariant) throw new AppError("NOT_FOUND", "Material variant not found");

  const unit = params.unit || (materialVariant.baseUnit === "G" ? "g" : materialVariant.baseUnit === "ML" ? "ml" : "pcs");

  let normalizedQuantity: any = null;
  const newBalance = await prisma.$transaction(async (tx) => {
    const quantity = await convertToBaseUnit(params.materialVariantId, params.quantity, unit, (materialVariant.baseUnit || "PCS") as any, tx);
    normalizedQuantity = quantity.negated();
    return await createLedgerEntry(tx, {
      materialVariantId: params.materialVariantId,
      warehouseId: params.warehouseId,
      movementType: StockMovementType.WASTE,
      quantity: normalizedQuantity.toNumber(),
      referenceType: StockReferenceType.WASTE,
      remarks: params.remarks,
      createdById: userId,
    });
  });

  return {
    newBalance: Number(newBalance),
    quantity: params.quantity,
    unit: params.unit || (materialVariant.baseUnit === "G" ? "g" : materialVariant.baseUnit === "ML" ? "ml" : "pcs"),
    normalizedQuantity: normalizedQuantity?.toNumber() ?? 0,
    normalizedUnit: materialVariant.baseUnit || "PCS"
  };
};

/**
 * Get paginated stock movement ledger log
 */
export const getStockMovements = async (filters: GetStockMovementsFilters) => {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.StockLedgerWhereInput = {};

  if (filters.warehouseId) {
    whereClause.warehouseId = filters.warehouseId;
  }

  if (filters.movementType) {
    whereClause.movementType = filters.movementType;
  }

  if (filters.materialVariantId) {
    whereClause.materialVariantId = filters.materialVariantId;
  }

  if (filters.dateFrom || filters.dateTo) {
    const range: any = {};
    if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
    if (filters.dateTo) range.lte = new Date(filters.dateTo);
    whereClause.createdAt = range;
  }

  if (filters.search) {
    const search = filters.search.trim();
    whereClause.OR = [
      { materialVariant: { name: { contains: search, mode: "insensitive" } } },
      { materialVariant: { sku: { contains: search, mode: "insensitive" } } },
    ];
  }

  const total = await prisma.stockLedger.count({ where: whereClause });

  const ledgerRecords = await prisma.stockLedger.findMany({
    where: whereClause,
    include: {
      warehouse: { select: { name: true } },
      materialVariant: { select: { name: true, sku: true } },
      createdBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const data = ledgerRecords.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    warehouseName: r.warehouse.name,
    productName: r.materialVariant.name,
    sku: r.materialVariant.sku || "-",
    movementType: r.movementType,
    quantity: Number(r.quantity),
    quantityBefore: Number(r.quantityBefore),
    quantityAfter: Number(r.quantityAfter),
    referenceType: r.referenceType,
    referenceId: r.referenceId || "-",
    remarks: r.remarks || "-",
    createdBy: r.createdBy?.fullName || "System",
  }));

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getActiveWarehouses = async () => {
  return await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
};

export const getActiveUnits = async () => {
  return await prisma.unit.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
};

export interface OpeningStockItem {
  materialVariantId: string;
  quantity: number;
  unit?: string;
  remarks?: string;
}

export interface RecordOpeningStockPayload {
  warehouseId: string;
  items: OpeningStockItem[];
}

export const recordOpeningStock = async (userId: string, payload: RecordOpeningStockPayload) => {
  const { warehouseId, items } = payload;

  return await prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse || !warehouse.isActive) {
      throw new AppError("BAD_REQUEST", "Warehouse does not exist or is inactive");
    }

    const materialVariantIdsInRequest = items.map((item) => item.materialVariantId);
    const uniqueMaterialVariantIds = new Set(materialVariantIdsInRequest);
    if (uniqueMaterialVariantIds.size !== materialVariantIdsInRequest.length) {
      throw new AppError("BAD_REQUEST", "Duplicate material variants are not allowed in Opening Stock.");
    }

    const results = [];
    for (const item of items) {
      const { materialVariantId, quantity, remarks } = item;

      if (quantity <= 0) {
        throw new AppError("BAD_REQUEST", "Quantity must be greater than zero");
      }

      const materialVariant = await tx.materialVariant.findUnique({ where: { id: materialVariantId } });
      if (!materialVariant || !materialVariant.isActive) {
        throw new AppError("BAD_REQUEST", `Material variant ${materialVariantId} not found or inactive`);
      }

      const existingOpening = await tx.stockLedger.findFirst({
        where: {
          warehouseId,
          materialVariantId,
          movementType: StockMovementType.OPENING,
        },
      });
      if (existingOpening) {
        throw new AppError("BAD_REQUEST", "Opening stock already exists.");
      }

      const inputUnit = item.unit || (materialVariant.baseUnit === "G" ? "g" : materialVariant.baseUnit === "ML" ? "ml" : "pcs");
      const normalizedQuantity = await convertToBaseUnit(materialVariant.id, quantity, inputUnit, (materialVariant.baseUnit || "PCS") as any, tx);

      const newBalance = await createLedgerEntry(tx, {
        materialVariantId,
        warehouseId,
        movementType: StockMovementType.OPENING,
        quantity: normalizedQuantity.toNumber(),
        referenceType: StockReferenceType.OPENING,
        remarks: remarks || "Stok Awal",
        createdById: userId,
      });

      results.push({
        materialVariantId,
        name: materialVariant.name,
        newBalance: Number(newBalance),
        quantity,
        unit: inputUnit,
        normalizedQuantity: normalizedQuantity.toNumber(),
        normalizedUnit: materialVariant.baseUnit || "PCS"
      });
    }

    return results;
  });
};

export interface CreateStockTransferItem {
  materialVariantId: string;
  quantity: number;
  unit?: string;
}

export interface CreateStockTransferPayload {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: CreateStockTransferItem[];
  remarks?: string;
  sourceResponsibleUserId?: string | null;
  destinationResponsibleUserId?: string | null;
}

export const createStockTransfer = async (userId: string, payload: CreateStockTransferPayload) => {
  const { sourceWarehouseId, destinationWarehouseId, items, remarks, sourceResponsibleUserId, destinationResponsibleUserId } = payload;

  if (sourceWarehouseId === destinationWarehouseId) {
    throw new AppError("BAD_REQUEST", "Source and destination warehouses must be different");
  }

  const sourceWarehouse = await prisma.warehouse.findUnique({ where: { id: sourceWarehouseId } });
  const destinationWarehouse = await prisma.warehouse.findUnique({ where: { id: destinationWarehouseId } });
  if (!sourceWarehouse || !sourceWarehouse.isActive) throw new AppError("BAD_REQUEST", "Source warehouse not found or inactive");
  if (!destinationWarehouse || !destinationWarehouse.isActive) throw new AppError("BAD_REQUEST", "Destination warehouse not found or inactive");

  const materialVariantIds = items.map((i) => i.materialVariantId);
  const materialVariants = await prisma.materialVariant.findMany({ where: { id: { in: materialVariantIds } } });
  const materialVariantMap = new Map(materialVariants.map((variant) => [variant.id, variant]));
  for (const it of items) {
    const variant = materialVariantMap.get(it.materialVariantId);
    if (!variant || !variant.isActive) {
      throw new AppError("BAD_REQUEST", `Material variant ${it.materialVariantId} not found or inactive`);
    }
    if (it.quantity <= 0) {
      throw new AppError("BAD_REQUEST", "Quantity must be greater than zero");
    }
  }

  if (sourceResponsibleUserId) {
    const su = await prisma.user.findUnique({ where: { id: sourceResponsibleUserId } });
    if (!su) throw new AppError("BAD_REQUEST", "Source responsible user not found");
    if (!(su.role === "ADMIN" || su.role === "WAREHOUSE")) {
      throw new AppError("BAD_REQUEST", "Source responsible user must have role ADMIN or WAREHOUSE");
    }
  }
  if (destinationResponsibleUserId) {
    const du = await prisma.user.findUnique({ where: { id: destinationResponsibleUserId } });
    if (!du) throw new AppError("BAD_REQUEST", "Destination responsible user not found");
    if (destinationWarehouse.warehouseType === "KITCHEN_STORAGE" && du.role !== "KITCHEN") {
      throw new AppError("BAD_REQUEST", "Destination responsible user must have role KITCHEN for kitchen storage warehouse");
    }
  }

  const transferNumber = `TRF-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(Math.random()*900000+100000)}`;

  const created = await prisma.stockTransfer.create({
    data: {
      transferNumber,
      sourceWarehouseId,
      destinationWarehouseId,
      requestedById: userId,
      sourceResponsibleUserId: sourceResponsibleUserId || null,
      destinationResponsibleUserId: destinationResponsibleUserId || null,
      remarks: remarks || null,
      items: {
        create: await Promise.all(items.map(async (it) => {
          const variant = materialVariantMap.get(it.materialVariantId)!;
          const inputUnit = it.unit || (variant.baseUnit === "G" ? "g" : variant.baseUnit === "ML" ? "ml" : "pcs");
          const normalizedQty = await convertToBaseUnit(variant.id, it.quantity, inputUnit, (variant.baseUnit || "PCS") as any, prisma);
          return {
            materialVariantId: it.materialVariantId,
            quantity: normalizedQty.toNumber()
          };
        })),
      },
    },
    include: { items: true },
  });

  return created;
};

export const completeStockTransfer = async (userId: string, transferId: string) => {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true, sourceWarehouse: true, destinationWarehouse: true },
    });
    if (!transfer) throw new AppError("NOT_FOUND", "Stock transfer not found");
    if (transfer.status !== "DRAFT") throw new AppError("BAD_REQUEST", "Only DRAFT transfers can be completed");

    const completingUser = await tx.user.findUnique({ where: { id: userId } });
    if (!completingUser) throw new AppError("UNAUTHORIZED", "User not found");
    if (transfer.destinationWarehouse.warehouseType === "KITCHEN_STORAGE") {
      if (!(completingUser.role === "KITCHEN" || completingUser.role === "ADMIN")) {
        throw new AppError("FORBIDDEN", "Only Kitchen users or Admin may complete transfer to Kitchen Storage");
      }
    }

    for (const item of transfer.items) {
      const qty = Number(item.quantity);
      if (qty <= 0) throw new AppError("BAD_REQUEST", "Item quantity must be greater than zero");

      await createLedgerEntry(tx, {
        materialVariantId: item.materialVariantId,
        warehouseId: transfer.sourceWarehouseId,
        movementType: StockMovementType.TRANSFER_OUT,
        quantity: -qty,
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        remarks: transfer.remarks || `Transfer ${transfer.transferNumber}`,
        createdById: userId,
      });

      await createLedgerEntry(tx, {
        materialVariantId: item.materialVariantId,
        warehouseId: transfer.destinationWarehouseId,
        movementType: StockMovementType.TRANSFER_IN,
        quantity: qty,
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        remarks: transfer.remarks || `Transfer ${transfer.transferNumber}`,
        createdById: userId,
      });
    }

    const updated = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: "COMPLETED", completedById: userId, completedAt: new Date() },
    });

    return updated;
  });
};

export const getStockTransfers = async (userId: string, userRole: string, userWarehouseId: string | null) => {
  const whereClause: any = {};

  if (userRole === "WAREHOUSE") {
    if (!userWarehouseId) {
      throw new AppError("FORBIDDEN", "Warehouse user must be assigned to a warehouse");
    }
    whereClause.OR = [
      { sourceWarehouseId: userWarehouseId },
      { destinationWarehouseId: userWarehouseId }
    ];
  } else if (userRole === "KITCHEN") {
    whereClause.destinationWarehouse = {
      warehouseType: "KITCHEN_STORAGE"
    };
  }

  return await prisma.stockTransfer.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          materialVariant: { select: { name: true, sku: true } }
        }
      },
      sourceWarehouse: { select: { name: true } },
      destinationWarehouse: { select: { name: true } },
      requestedBy: { select: { fullName: true } },
      completedBy: { select: { fullName: true } }
    },
    orderBy: { createdAt: "desc" }
  });
};
