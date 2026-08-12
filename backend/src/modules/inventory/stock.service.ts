import { Prisma, WarehouseType } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { CreateLedgerEntryParams } from "./types";
import { AppError } from "../../utils/errorHandler";

/**
 * Centrally managed inventory ledger mutation gatekeeper.
 * Updates WarehouseStock (cache snapshot) and creates StockLedger (immutable record)
 * in a single atomic transaction step. Prevents negative stock.
 */
export const createLedgerEntry = async (
  tx: Prisma.TransactionClient,
  params: CreateLedgerEntryParams
): Promise<Decimal> => {
  const {
    productId,
    warehouseId,
    movementType,
    quantity,
    referenceType,
    referenceId,
    remarks,
    createdById,
  } = params;

  // 1. Resolve product tracking info
  const product = await tx.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("NOT_FOUND", `Product ${productId} not found`);
  }

  // 2. Fetch warehouse metadata and initialize the cache snapshot
  const warehouse = await tx.warehouse.findUnique({
    where: { id: warehouseId },
  });
  if (!warehouse) {
    throw new AppError("NOT_FOUND", `Warehouse ${warehouseId} not found`);
  }

  const currentStock = await tx.warehouseStock.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId,
        productId,
      },
    },
  });

  const quantityBefore = currentStock ? currentStock.quantity : new Decimal(0);
  const quantityChange = new Decimal(quantity);
  const quantityAfter = quantityBefore.add(quantityChange);

  // 3. Prevent negative stock if trackInventory is enabled except for kitchen storage
  if (product.trackInventory && quantityAfter.lt(0)) {
    const isKitchenStorage = warehouse.warehouseType === WarehouseType.KITCHEN_STORAGE;
    if (!isKitchenStorage) {
      throw new AppError(
        "BAD_REQUEST",
        `Insufficient inventory for product: ${product.name}. Current: ${quantityBefore.toString()}, Requested Change: ${quantity.toString()}`
      );
    }
  }

  // 4. Create immutable StockLedger record
  await tx.stockLedger.create({
    data: {
      warehouseId,
      productId,
      movementType,
      quantity: quantityChange,
      quantityBefore,
      quantityAfter,
      referenceType,
      referenceId: referenceId || null,
      remarks: remarks || null,
      createdById: createdById || null,
    },
  });

  // 5. Update cached WarehouseStock snapshot
  const updatedStock = await tx.warehouseStock.upsert({
    where: {
      warehouseId_productId: {
        warehouseId,
        productId,
      },
    },
    create: {
      warehouseId,
      productId,
      quantity: quantityAfter,
    },
    update: {
      quantity: quantityAfter,
    },
  });

  return updatedStock.quantity;
};
