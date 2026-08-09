import { PrismaClient, Prisma, StockMovementType, StockReferenceType } from "@prisma/client";
import { getInventoryStatus } from "@shared/types";
import { createLedgerEntry } from "./stock.service";
import { getCommittedStockMap } from "../products/service";
import {
  GetProductStockListFilters,
  GetStockMovementsFilters,
  ReceiveStockParams,
  AdjustStockParams,
  RemoveAsWasteParams,
} from "./types";
import { AppError } from "../../utils/errorHandler";

const prisma = new PrismaClient();

// Resolve default sales warehouse code from environment, fallback to "CONCESSION"
const DEFAULT_SALES_WAREHOUSE_CODE = process.env.DEFAULT_SALES_WAREHOUSE_CODE || "CONCESSION";

/**
 * Get inventory statistics summary for dashboard cards
 */
export const getInventorySummary = async () => {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, isActive: true },
    include: {
      recipe: {
        include: {
          items: {
            include: {
              componentProduct: true,
            },
          },
        },
      },
    },
  });

  const activeWarehouseStocks = await prisma.warehouseStock.findMany({
    where: {
      warehouse: {
        isActive: true,
      },
    },
    select: {
      productId: true,
      quantity: true,
    },
  });

  const totalStockMap = new Map<string, number>();
  for (const ws of activeWarehouseStocks) {
    const current = totalStockMap.get(ws.productId) || 0;
    totalStockMap.set(ws.productId, current + Number(ws.quantity));
  }

  const committedMap = await getCommittedStockMap(prisma);

  const totalProducts = products.length;
  const trackedProducts = products.filter((p) => p.trackInventory).length;

  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let totalValue = 0;

  for (const p of products) {
    const physicalQty = totalStockMap.get(p.id) || 0;

    // Valuation calculation: FINISHED_GOOD uses price, RAW_MATERIAL/PACKAGING uses cost
    if (p.inventoryType === "FINISHED_GOOD") {
      totalValue += physicalQty * Number(p.price || 0);
    } else {
      totalValue += physicalQty * Number(p.cost || 0);
    }

    if (!p.trackInventory) continue;

    let availableStock = 0;

    if (p.inventoryType === "FINISHED_GOOD") {
      if (p.recipe && p.recipe.items && p.recipe.items.length > 0) {
        let minProducible = Infinity;
        for (const item of p.recipe.items) {
          if (item.componentProduct && !item.componentProduct.trackInventory) {
            continue;
          }
          const componentPhysical = totalStockMap.get(item.componentProductId) || 0;
          const componentCommitted = committedMap.get(item.componentProductId) || 0;
          const componentStock = componentPhysical - componentCommitted;

          const requiredQty = Number(item.quantity);
          const producible = Math.floor(componentStock / requiredQty);
          if (producible < minProducible) {
            minProducible = producible;
          }
        }
        availableStock = minProducible === Infinity ? 0 : Math.max(0, minProducible);
      } else {
        availableStock = Math.max(0, physicalQty - (committedMap.get(p.id) || 0));
      }
    } else {
      // RAW_MATERIAL / PACKAGING
      availableStock = physicalQty - (committedMap.get(p.id) || 0);
    }

    if (availableStock <= 0) {
      outOfStockProducts++;
    } else if (availableStock <= Number(p.minimumStock)) {
      lowStockProducts++;
    }
  }

  // Count ledger entries created today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMovements = await prisma.stockLedger.count({
    where: {
      createdAt: { gte: startOfToday },
    },
  });

  return {
    totalProducts,
    trackedProducts,
    lowStockProducts,
    outOfStockProducts,
    todayMovements,
    inventoryValue: totalValue,
  };
};

/**
 * Get list of products with active warehouse stock snapshot values
 */
export const getProductStockList = async (filters: GetProductStockListFilters) => {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const skip = (page - 1) * limit;

  // Build where clause
  const whereClause: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  if (filters.search) {
    whereClause.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const isAllWarehouses = !filters.warehouseId || filters.warehouseId === "all";

  let mapped: any[] = [];

  if (isAllWarehouses) {
    const activeWarehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    if (activeWarehouses.length === 0) {
      return {
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const allProducts = await prisma.product.findMany({
      where: whereClause,
      include: {
        unit: true,
        warehouseStocks: {
          where: {
            warehouse: { isActive: true },
          },
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    for (const p of allProducts) {
      for (const wh of activeWarehouses) {
        const ws = p.warehouseStocks.find((s) => s.warehouseId === wh.id);
        const quantity = ws ? Number(ws.quantity) : 0;
        const minimumStock = Number(p.minimumStock);
        const status = getInventoryStatus(p.trackInventory, quantity, minimumStock);

        mapped.push({
          id: p.id,
          sku: p.sku || "-",
          name: p.name,
          trackInventory: p.trackInventory,
          inventoryType: p.inventoryType,
          unit: p.unit ? p.unit.symbol : "PCS",
          warehouseName: wh.name,
          warehouseId: wh.id,
          quantity,
          minimumStock,
          status,
        });
      }
    }
  } else {
    const targetWarehouse = await prisma.warehouse.findUnique({
      where: { id: filters.warehouseId },
    });

    if (!targetWarehouse || !targetWarehouse.isActive) {
      return {
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const allProducts = await prisma.product.findMany({
      where: whereClause,
      include: {
        unit: true,
        warehouseStocks: {
          where: { warehouseId: filters.warehouseId },
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    mapped = allProducts.map((p) => {
      const ws = p.warehouseStocks[0];
      const quantity = ws ? Number(ws.quantity) : 0;
      const minimumStock = Number(p.minimumStock);
      const status = getInventoryStatus(p.trackInventory, quantity, minimumStock);

      return {
        id: p.id,
        sku: p.sku || "-",
        name: p.name,
        trackInventory: p.trackInventory,
        inventoryType: p.inventoryType,
        unit: p.unit ? p.unit.symbol : "PCS",
        warehouseName: targetWarehouse.name,
        warehouseId: filters.warehouseId,
        quantity,
        minimumStock,
        status,
      };
    });
  }

  // Filter by stock status on JS level if filter is active
  let filtered = mapped;
  if (filters.stockStatus) {
    filtered = mapped.filter((item) => item.status === filters.stockStatus);
  }

  // Paginate result subset
  const total = filtered.length;
  const sliced = filtered.slice(skip, skip + limit);

  return {
    data: sliced,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Record stock replenishment (RECEIVE)
 */
export const createStockReceipt = async (userId: string, params: ReceiveStockParams) => {
  return await prisma.$transaction(async (tx) => {
    return await createLedgerEntry(tx, {
      productId: params.productId,
      warehouseId: params.warehouseId,
      movementType: StockMovementType.RECEIVE,
      quantity: params.quantity,
      referenceType: StockReferenceType.RECEIVE,
      remarks: params.remarks,
      createdById: userId,
    });
  });
};

/**
 * Record stock correction (ADJUSTMENT)
 */
export const adjustStock = async (userId: string, params: AdjustStockParams) => {
  return await prisma.$transaction(async (tx) => {
    return await createLedgerEntry(tx, {
      productId: params.productId,
      warehouseId: params.warehouseId,
      movementType: StockMovementType.ADJUSTMENT,
      quantity: params.quantity,
      referenceType: StockReferenceType.ADJUSTMENT,
      remarks: params.remarks,
      createdById: userId,
    });
  });
};

/**
 * Record inventory wastage (WASTE)
 */
export const removeAsWaste = async (userId: string, params: RemoveAsWasteParams) => {
  return await prisma.$transaction(async (tx) => {
    return await createLedgerEntry(tx, {
      productId: params.productId,
      warehouseId: params.warehouseId,
      movementType: StockMovementType.WASTE,
      quantity: -params.quantity, // deduction is negative
      referenceType: StockReferenceType.WASTE,
      remarks: params.remarks,
      createdById: userId,
    });
  });
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

  if (filters.productId) {
    whereClause.productId = filters.productId;
  }

  if (filters.dateFrom || filters.dateTo) {
    const range: any = {};
    if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
    if (filters.dateTo) range.lte = new Date(filters.dateTo);
    whereClause.createdAt = range;
  }

  if (filters.search) {
    whereClause.OR = [
      { product: { name: { contains: filters.search, mode: "insensitive" } } },
      { product: { sku: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const total = await prisma.stockLedger.count({ where: whereClause });

  const ledgerRecords = await prisma.stockLedger.findMany({
    where: whereClause,
    include: {
      warehouse: { select: { name: true } },
      product: { select: { name: true, sku: true } },
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
    productName: r.product.name,
    sku: r.product.sku || "-",
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
  productId: string;
  quantity: number;
  remarks?: string;
}

export interface RecordOpeningStockPayload {
  warehouseId: string;
  items: OpeningStockItem[];
}

export const recordOpeningStock = async (userId: string, payload: RecordOpeningStockPayload) => {
  const { warehouseId, items } = payload;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify warehouse exists and is active
    const warehouse = await tx.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse || !warehouse.isActive) {
      throw new AppError("BAD_REQUEST", "Warehouse does not exist or is inactive");
    }

    // 2. Prevent duplicate products in the request
    const productIdsInRequest = items.map((item) => item.productId);
    const uniqueProductIds = new Set(productIdsInRequest);
    if (uniqueProductIds.size !== productIdsInRequest.length) {
      throw new AppError("BAD_REQUEST", "Duplicate products are not allowed in Opening Stock.");
    }

    // 3. Process each line item
    const results = [];
    for (const item of items) {
      const { productId, quantity, remarks } = item;

      // Validate quantity > 0
      if (quantity <= 0) {
        throw new AppError("BAD_REQUEST", "Quantity must be greater than zero");
      }

      // Fetch product and verify active & tracks inventory
      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!product || product.deletedAt !== null || !product.isActive) {
        throw new AppError("BAD_REQUEST", `Product ${productId} not found or inactive`);
      }
      if (!product.trackInventory) {
        throw new AppError("BAD_REQUEST", `Product '${product.name}' is not configured to track inventory.`);
      }

      // Validate duplicate opening stock: Check if an OPENING movement already exists in StockLedger for this (warehouseId, productId) pair
      const existingOpening = await tx.stockLedger.findFirst({
        where: {
          warehouseId,
          productId,
          movementType: StockMovementType.OPENING,
        },
      });
      if (existingOpening) {
        throw new AppError("BAD_REQUEST", "Opening stock already exists.");
      }

      // Create ledger entry using gatekeeper createLedgerEntry
      const newBalance = await createLedgerEntry(tx, {
        productId,
        warehouseId,
        movementType: StockMovementType.OPENING,
        quantity,
        referenceType: StockReferenceType.OPENING,
        remarks: remarks || "Stok Awal",
        createdById: userId,
      });

      results.push({ productId, name: product.name, newBalance });
    }

    return results;
  });
};

export interface CreateStockTransferItem {
  productId: string;
  quantity: number;
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

  // Basic validations
  const sourceWarehouse = await prisma.warehouse.findUnique({ where: { id: sourceWarehouseId } });
  const destinationWarehouse = await prisma.warehouse.findUnique({ where: { id: destinationWarehouseId } });
  if (!sourceWarehouse || !sourceWarehouse.isActive) throw new AppError("BAD_REQUEST", "Source warehouse not found or inactive");
  if (!destinationWarehouse || !destinationWarehouse.isActive) throw new AppError("BAD_REQUEST", "Destination warehouse not found or inactive");

  // Validate products
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const it of items) {
    const p = productMap.get(it.productId);
    if (!p || p.deletedAt !== null || !p.isActive) {
      throw new AppError("BAD_REQUEST", `Product ${it.productId} not found or inactive`);
    }
    if (!p.trackInventory) {
      throw new AppError("BAD_REQUEST", `Product '${p.name}' is not configured to track inventory.`);
    }
    if (it.quantity <= 0) {
      throw new AppError("BAD_REQUEST", "Quantity must be greater than zero");
    }
  }

  // Validate responsible users if provided
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

  // Create transfer document with items
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
        create: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
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

    // Role validation: if destination is kitchen storage, require completing user to be KITCHEN or ADMIN
    const completingUser = await tx.user.findUnique({ where: { id: userId } });
    if (!completingUser) throw new AppError("UNAUTHORIZED", "User not found");
    if (transfer.destinationWarehouse.warehouseType === "KITCHEN_STORAGE") {
      if (!(completingUser.role === "KITCHEN" || completingUser.role === "ADMIN")) {
        throw new AppError("FORBIDDEN", "Only Kitchen users or Admin may complete transfer to Kitchen Storage");
      }
    }

    // For each item, create TRANSFER_OUT then TRANSFER_IN ledger entries
    for (const item of transfer.items) {
      const qty = Number(item.quantity);
      if (qty <= 0) throw new AppError("BAD_REQUEST", "Item quantity must be greater than zero");

      // Create OUT on source (negative)
      await createLedgerEntry(tx, {
        productId: item.productId,
        warehouseId: transfer.sourceWarehouseId,
        movementType: StockMovementType.TRANSFER_OUT,
        quantity: -qty,
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        remarks: transfer.remarks || `Transfer ${transfer.transferNumber}`,
        createdById: userId,
      });

      // Create IN on destination (positive)
      await createLedgerEntry(tx, {
        productId: item.productId,
        warehouseId: transfer.destinationWarehouseId,
        movementType: StockMovementType.TRANSFER_IN,
        quantity: qty,
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        remarks: transfer.remarks || `Transfer ${transfer.transferNumber}`,
        createdById: userId,
      });
    }

    // Mark transfer completed
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
          product: { select: { name: true, sku: true } }
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
