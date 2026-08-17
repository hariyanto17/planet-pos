import { Prisma, WarehouseType } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { CreateLedgerEntryParams } from "./types";
import { AppError } from "../../utils/errorHandler";

/**
 * Centrally managed inventory ledger mutation gatekeeper.
 * Updates WarehouseStock (cache snapshot) and creates StockLedger (immutable record)
 * in a single atomic transaction step.
 *
 * Constraint for KITCHEN_STORAGE warehouses:
 * - Negative stock is allowed, but the negative cannot exceed the total available stock
 *   across all kitchen storage warehouses combined.
 * - For other warehouses: prevents negative stock entirely.
 */
export const createLedgerEntry = async (
  tx: Prisma.TransactionClient,
  params: CreateLedgerEntryParams
): Promise<Decimal> => {
  const {
    materialVariantId,
    warehouseId,
    movementType,
    quantity,
    referenceType,
    referenceId,
    packagingVersionId,
    receivedQuantity,
    receivedUnit,
    remarks,
    createdById,
  } = params;

  const materialVariant = await tx.materialVariant.findUnique({
    where: { id: materialVariantId },
  });

  if (!materialVariant) {
    throw new AppError("NOT_FOUND", `Material variant ${materialVariantId} not found`);
  }

  const warehouse = await tx.warehouse.findUnique({
    where: { id: warehouseId },
  });
  if (!warehouse) {
    throw new AppError("NOT_FOUND", `Warehouse ${warehouseId} not found`);
  }

  const currentStock = await tx.inventoryStock.findUnique({
    where: {
      warehouseId_materialVariantId: {
        warehouseId,
        materialVariantId,
      },
    },
  });

  const quantityBefore = currentStock ? currentStock.quantity : new Decimal(0);
  const quantityChange = new Decimal(quantity);
  const quantityAfter = quantityBefore.add(quantityChange);

  if (quantityAfter.lt(0)) {
    const isKitchenStorage = warehouse.warehouseType === WarehouseType.KITCHEN_STORAGE;

    if (!isKitchenStorage) {
      // Non-kitchen storage warehouses cannot go negative
      throw new AppError(
        "BAD_REQUEST",
        `Insufficient inventory for material variant: ${materialVariant.name}. Current: ${quantityBefore.toString()}, Requested Change: ${quantity.toString()}`
      );
    }

    // For kitchen storage: check if negative exceeds total kitchen storage available
    const allKitchenStocks = await tx.inventoryStock.findMany({
      where: {
        materialVariantId,
        warehouse: {
          warehouseType: WarehouseType.KITCHEN_STORAGE,
          isActive: true,
        },
      },
      include: { warehouse: true },
    });

    const totalKitchenStock = allKitchenStocks.reduce(
      (sum, stock) => sum.add(stock.quantity),
      new Decimal(0)
    );

    // The new negative value must not exceed total kitchen storage
    // In other words: quantityAfter >= -totalKitchenStock
    const minAllowedNegative = totalKitchenStock.negated();

    if (quantityAfter.lt(minAllowedNegative)) {
      throw new AppError(
        "BAD_REQUEST",
        `Insufficient total kitchen storage for material variant: ${materialVariant.name}. ` +
        `Current in this warehouse: ${quantityBefore.toString()}, ` +
        `Total across all kitchens: ${totalKitchenStock.toString()}, ` +
        `Cannot go below: ${minAllowedNegative.toString()}`
      );
    }
  }

  await tx.stockLedger.create({
    data: {
      warehouseId,
      materialVariantId,
      movementType,
      quantity: quantityChange,
      quantityBefore,
      quantityAfter,
      referenceType,
      referenceId: referenceId || null,
      packagingVersionId: packagingVersionId || null,
      receivedQuantity: receivedQuantity ?? null,
      receivedUnit: receivedUnit || null,
      remarks: remarks || null,
      createdById: createdById || null,
    },
  });

  const updatedStock = await tx.inventoryStock.upsert({
    where: {
      warehouseId_materialVariantId: {
        warehouseId,
        materialVariantId,
      },
    },
    create: {
      warehouseId,
      materialVariantId,
      quantity: quantityAfter,
    },
    update: {
      quantity: quantityAfter,
    },
  });

  return updatedStock.quantity;
};
