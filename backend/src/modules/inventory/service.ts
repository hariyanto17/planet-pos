import { PrismaClient, Prisma, StockMovementType, StockReferenceType } from "@prisma/client";
import { getInventoryStatus } from "@shared/types";
import { createLedgerEntry } from "./stock.service";
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
      warehouseStocks: true,
    },
  });

  const totalProducts = products.length;
  const trackedProducts = products.filter((p) => p.trackInventory).length;

  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let totalValue = 0;

  for (const p of products) {
    if (!p.trackInventory) continue;

    // Sum quantity across all warehouses for this product
    const totalQty = p.warehouseStocks.reduce((sum, s) => sum + Number(s.quantity), 0);
    totalValue += totalQty * Number(p.price);

    const status = getInventoryStatus(true, totalQty, Number(p.minimumStock));
    if (status === "OUT_OF_STOCK") {
      outOfStockProducts++;
    } else if (status === "LOW_STOCK") {
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

  // 1. Resolve active warehouse code or id
  let targetWarehouseId = filters.warehouseId;
  if (!targetWarehouseId) {
    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { code: DEFAULT_SALES_WAREHOUSE_CODE },
    });
    targetWarehouseId = defaultWarehouse?.id;
  }

  if (!targetWarehouseId) {
    // If no warehouses exist at all, return empty
    return {
      data: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
    };
  }

  // 2. Build where clause
  const whereClause: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  if (filters.search) {
    whereClause.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // 3. Load all products matching constraints first
  const allProducts = await prisma.product.findMany({
    where: whereClause,
    include: {
      unit: true,
      warehouseStocks: {
        where: { warehouseId: targetWarehouseId },
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // 4. Map stock levels and compute backend status
  const mapped = allProducts.map((p) => {
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
      warehouseName: ws?.warehouse.name || "Default Warehouse",
      warehouseId: targetWarehouseId,
      quantity,
      minimumStock,
      status,
    };
  });

  // 5. Filter by stock status on JS level if filter is active
  let filtered = mapped;
  if (filters.stockStatus) {
    filtered = mapped.filter((item) => item.status === filters.stockStatus);
  }

  // 6. Paginate result subset
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
