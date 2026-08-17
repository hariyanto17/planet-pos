import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { Prisma, StockRequestStatus, StockTransferStatus, StockMovementType, StockReferenceType } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { createLedgerEntry } from "./stock.service";
import { convertToBaseUnit } from "../../utils/units";

export const createStockRequest = async (
  userId: string,
  userWarehouseId: string | null,
  userRole: string,
  requestingWarehouseId: string,
  items: Array<{ productId: string; variantId: string; packagingId?: string | null; quantity: number }>,
  notes?: string
) => {
  if (userRole === "WAREHOUSE" && userWarehouseId !== requestingWarehouseId) {
    throw new AppError("FORBIDDEN", "You can only request stock for your assigned warehouse");
  }

  const requestingWarehouse = await prisma.warehouse.findUnique({ where: { id: requestingWarehouseId } });
  if (!requestingWarehouse || !requestingWarehouse.isActive) {
    throw new AppError("BAD_REQUEST", "Requesting warehouse not found or inactive");
  }

  if (!items || items.length === 0) {
    throw new AppError("BAD_REQUEST", "At least one item is required");
  }

  const requestNumber = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    Math.random() * 900000 + 100000
  )}`;

  return await prisma.$transaction(async (tx) => {
    const created = await tx.stockRequest.create({
      data: {
        requestNumber,
        requesterId: userId,
        requestingWarehouseId,
        notes: notes || null,
        status: StockRequestStatus.PENDING,
      },
    });

    for (const item of items) {
      // 1. Validate Product
      const product = await tx.material.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) {
        throw new AppError("BAD_REQUEST", `Product ${item.productId} not found or inactive`);
      }

      // 2. Validate Variant belongs to Product
      const variant = await tx.materialVariant.findUnique({
        where: { id: item.variantId },
      });
      if (!variant || !variant.isActive) {
        throw new AppError("BAD_REQUEST", `Material variant ${item.variantId} not found or inactive`);
      }
      if (variant.materialId !== item.productId) {
        throw new AppError("BAD_REQUEST", `Selected variant ${item.variantId} does not belong to the selected product ${item.productId}`);
      }

      const variantMultiplier = new Decimal(variant.quantityInBaseUnit);
      if (variantMultiplier.lte(0)) {
        throw new AppError("BAD_REQUEST", `Variant ${item.variantId} has an invalid base-unit conversion factor`);
      }

      // 3. Validate Packaging configuration belongs to variant (if provided)
      let packagingMultiplier = new Decimal(1);
      let packagingVersionId: string | null = null;

      if (item.packagingId) {
        const packaging = await tx.packagingConfiguration.findUnique({
          where: { id: item.packagingId },
          include: {
            versions: {
              where: { isActive: true, effectiveTo: null },
              orderBy: [{ effectiveFrom: "desc" }, { versionNumber: "desc" }],
              take: 1,
            },
          },
        });
        if (!packaging || packaging.materialVariantId !== variant.id) {
          throw new AppError("BAD_REQUEST", "Selected packaging does not belong to the selected variant");
        }
        if (!packaging.isActive || !packaging.versions[0]) {
          throw new AppError("BAD_REQUEST", "Selected packaging is inactive or has no active version");
        }
        packagingMultiplier = new Decimal(packaging.versions[0].conversionFactor);
        if (packagingMultiplier.lte(0)) {
          throw new AppError("BAD_REQUEST", "Selected packaging has an invalid conversion multiplier");
        }
        packagingVersionId = packaging.versions[0].id;
      }

      const normalizedQuantity = new Decimal(item.quantity).mul(packagingMultiplier).mul(variantMultiplier);

      await tx.stockRequestItem.create({
        data: {
          stockRequestId: created.id,
          materialVariantId: variant.id,
          quantity: normalizedQuantity,
          packagingVersionId,
          requestedQuantity: new Decimal(item.quantity),
        },
      });
    }

    return tx.stockRequest.findUnique({
      where: { id: created.id },
      include: {
        items: {
          include: {
            materialVariant: {
              include: {
                material: { select: { name: true } }
              }
            },
            packagingVersion: {
              include: {
                packagingConfiguration: { select: { name: true, unitLabel: true } }
              }
            }
          }
        }
      },
    });
  });
};

export const claimStockRequest = async (
  userId: string,
  userWarehouseId: string | null,
  userRole: string,
  requestId: string,
  sourceWarehouseId: string
) => {
  if (userRole === "WAREHOUSE" && userWarehouseId !== sourceWarehouseId) {
    throw new AppError("FORBIDDEN", "You can only claim requests for your assigned warehouse");
  }

  return await prisma.$transaction(async (tx) => {
    const request = await tx.stockRequest.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    if (!request) {
      throw new AppError("NOT_FOUND", "Stock request not found");
    }

    if (request.status !== StockRequestStatus.PENDING) {
      throw new AppError("CONFLICT", "Request has already been claimed or handled");
    }

    const sourceWarehouse = await tx.warehouse.findUnique({ where: { id: sourceWarehouseId } });
    if (!sourceWarehouse || !sourceWarehouse.isActive) {
      throw new AppError("BAD_REQUEST", "Source warehouse not found or inactive");
    }

    if (sourceWarehouseId === request.requestingWarehouseId) {
      throw new AppError("BAD_REQUEST", "Source and requesting warehouse cannot be the same");
    }

    for (const item of request.items) {
      const stock = await tx.inventoryStock.findUnique({
        where: {
          warehouseId_materialVariantId: {
            warehouseId: sourceWarehouseId,
            materialVariantId: item.materialVariantId,
          },
        },
      });

      const available = stock ? Number(stock.quantity) : 0;
      if (available < Number(item.quantity)) {
        throw new AppError("BAD_REQUEST", `Insufficient stock in source warehouse for material variant ${item.materialVariantId}`);
      }
    }

    const updated = await tx.stockRequest.updateMany({
      where: { id: requestId, status: StockRequestStatus.PENDING },
      data: {
        status: StockRequestStatus.FULFILLING,
        sourceWarehouseId,
        sourceUserId: userId,
        claimedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new AppError("CONFLICT", "Request already claimed");
    }

    return tx.stockRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { items: { include: { materialVariant: true } } },
    });
  });
};

export const shipStockRequest = async (userId: string, requestId: string) => {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.stockRequest.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    if (!request) throw new AppError("NOT_FOUND", "Stock request not found");
    if (request.status !== StockRequestStatus.FULFILLING) {
      throw new AppError("BAD_REQUEST", "Only claimed requests in FULFILLING state can be shipped");
    }

    if (!request.sourceWarehouseId) {
      throw new AppError("BAD_REQUEST", "Request has not been claimed yet");
    }

    const sourceWarehouseId = request.sourceWarehouseId;
    const destinationWarehouseId = request.requestingWarehouseId;

    for (const item of request.items) {
      const stock = await tx.inventoryStock.findUnique({
        where: {
          warehouseId_materialVariantId: {
            warehouseId: sourceWarehouseId,
            materialVariantId: item.materialVariantId,
          },
        },
      });
      const available = stock ? Number(stock.quantity) : 0;
      if (available < Number(item.quantity)) {
        throw new AppError("BAD_REQUEST", `Insufficient stock for material variant ${item.materialVariantId}`);
      }
    }

    // Create StockTransfer
    const transferNumber = `TRF-REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      Math.random() * 900000 + 100000
    )}`;

    const transfer = await tx.stockTransfer.create({
      data: {
        transferNumber,
        sourceWarehouseId,
        destinationWarehouseId,
        requestedById: request.requesterId,
        sourceResponsibleUserId: request.sourceUserId,
        status: StockTransferStatus.IN_TRANSIT,
        stockRequestId: request.id,
        remarks: request.notes || `Fulfillment of request ${request.requestNumber}`,
        items: {
          create: request.items.map((it) => ({
            materialVariantId: it.materialVariantId,
            quantity: it.quantity,
            packagingVersionId: it.packagingVersionId,
            requestedQuantity: it.requestedQuantity,
          })),
        },
      },
    });

    // Create TRANSFER_OUT ledger entries (deduct from source)
    for (const item of request.items) {
      await createLedgerEntry(tx, {
        materialVariantId: item.materialVariantId,
        warehouseId: sourceWarehouseId,
        movementType: StockMovementType.TRANSFER_OUT,
        quantity: -Number(item.quantity),
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        packagingVersionId: item.packagingVersionId,
        receivedQuantity: item.requestedQuantity ? Number(item.requestedQuantity) : undefined,
        remarks: `Shipped request ${request.requestNumber}`,
        createdById: userId,
      });
    }

    // Update Request status to SHIPPED
    return tx.stockRequest.update({
      where: { id: requestId },
      data: {
        status: StockRequestStatus.SHIPPED,
        shippedAt: new Date(),
      },
      include: {
        items: {
          include: {
            materialVariant: {
              include: {
                material: { select: { name: true } }
              }
            },
            packagingVersion: {
              include: {
                packagingConfiguration: { select: { name: true, unitLabel: true } }
              }
            }
          }
        }
      },
    });
  });
};

export const receiveStockRequest = async (
  userId: string,
  userWarehouseId: string | null,
  userRole: string,
  requestId: string
) => {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.stockRequest.findUnique({
      where: { id: requestId },
      include: { stockTransfer: true },
    });

    if (!request) throw new AppError("NOT_FOUND", "Stock request not found");
    if (request.status !== StockRequestStatus.SHIPPED) {
      throw new AppError("BAD_REQUEST", "Only SHIPPED requests can be received");
    }

    if (userRole === "WAREHOUSE" && userWarehouseId !== request.requestingWarehouseId) {
      throw new AppError("FORBIDDEN", "You can only receive requests for your assigned warehouse");
    }

    // Update transfer status
    if (request.stockTransfer) {
      await tx.stockTransfer.update({
        where: { id: request.stockTransfer.id },
        data: { status: StockTransferStatus.RECEIVED },
      });
    }

    return tx.stockRequest.update({
      where: { id: requestId },
      data: {
        status: StockRequestStatus.RECEIVED,
        receivedAt: new Date(),
      },
      include: { items: { include: { materialVariant: true } } },
    });
  });
};

export const acceptStockRequest = async (
  userId: string,
  userWarehouseId: string | null,
  userRole: string,
  requestId: string
) => {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.stockRequest.findUnique({
      where: { id: requestId },
      include: { items: true, stockTransfer: true },
    });

    if (!request) throw new AppError("NOT_FOUND", "Stock request not found");
    if (request.status !== StockRequestStatus.RECEIVED) {
      throw new AppError("BAD_REQUEST", "Only RECEIVED requests can be accepted");
    }

    if (userRole === "WAREHOUSE" && userWarehouseId !== request.requestingWarehouseId) {
      throw new AppError("FORBIDDEN", "You can only accept requests for your assigned warehouse");
    }

    const transfer = request.stockTransfer;
    if (!transfer) {
      throw new AppError("BAD_REQUEST", "Linked transfer not found");
    }

    // Create TRANSFER_IN ledger entries (add to destination)
    for (const item of request.items) {
      await createLedgerEntry(tx, {
        materialVariantId: item.materialVariantId,
        warehouseId: request.requestingWarehouseId,
        movementType: StockMovementType.TRANSFER_IN,
        quantity: Number(item.quantity),
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        packagingVersionId: item.packagingVersionId,
        receivedQuantity: item.requestedQuantity ? Number(item.requestedQuantity) : undefined,
        remarks: `Accepted request ${request.requestNumber}`,
        createdById: userId,
      });
    }

    // Finalize StockTransfer
    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: StockTransferStatus.COMPLETED,
        completedById: userId,
        completedAt: new Date(),
      },
    });

    // Update request to ACCEPTED
    return tx.stockRequest.update({
      where: { id: requestId },
      data: {
        status: StockRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: { items: { include: { materialVariant: true } } },
    });
  });
};

export const cancelStockRequest = async (
  userId: string,
  userWarehouseId: string | null,
  userRole: string,
  requestId: string
) => {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.stockRequest.findUnique({
      where: { id: requestId },
      include: { stockTransfer: true },
    });

    if (!request) throw new AppError("NOT_FOUND", "Stock request not found");

    if (
      request.status !== StockRequestStatus.PENDING &&
      request.status !== StockRequestStatus.FULFILLING
    ) {
      throw new AppError("BAD_REQUEST", "Requests cannot be cancelled after shipment");
    }

    // Validate ownership/permissions
    if (userRole === "WAREHOUSE" && userWarehouseId !== request.requestingWarehouseId) {
      throw new AppError("FORBIDDEN", "You can only cancel requests for your assigned warehouse");
    }

    // If there's an active transfer, mark it cancelled
    if (request.stockTransfer) {
      await tx.stockTransfer.update({
        where: { id: request.stockTransfer.id },
        data: { status: StockTransferStatus.CANCELLED },
      });
    }

    return tx.stockRequest.update({
      where: { id: requestId },
      data: {
        status: StockRequestStatus.CANCELLED,
      },
      include: { items: { include: { materialVariant: true } } },
    });
  });
};

export const getStockRequests = async (
  userId: string,
  userRole: string,
  userWarehouseId: string | null,
  filters: { scope?: string; status?: StockRequestStatus }
) => {
  const whereClause: any = {};

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.scope === "my-requests") {
    // Requests created by the user / user's warehouse
    if (userRole === "WAREHOUSE") {
      whereClause.requestingWarehouseId = userWarehouseId;
    } else {
      whereClause.requesterId = userId;
    }
  } else if (filters.scope === "available") {
    // Pending requests that claimant can claim
    whereClause.status = StockRequestStatus.PENDING;
    if (userRole === "WAREHOUSE") {
      whereClause.requestingWarehouseId = { not: userWarehouseId };
    }
  } else if (filters.scope === "my-fulfillments") {
    // Requests this user/warehouse claimed
    whereClause.status = { in: [StockRequestStatus.FULFILLING, StockRequestStatus.SHIPPED, StockRequestStatus.RECEIVED] };
    if (userRole === "WAREHOUSE") {
      whereClause.sourceWarehouseId = userWarehouseId;
    } else {
      whereClause.sourceUserId = userId;
    }
  } else if (filters.scope === "incoming") {
    // Requests being shipped to this warehouse
    whereClause.status = { in: [StockRequestStatus.SHIPPED, StockRequestStatus.RECEIVED] };
    if (userRole === "WAREHOUSE") {
      whereClause.requestingWarehouseId = userWarehouseId;
    } else {
      whereClause.requesterId = userId;
    }
  } else if (filters.scope === "completed") {
    whereClause.status = StockRequestStatus.ACCEPTED;
    if (userRole === "WAREHOUSE") {
      whereClause.OR = [
        { requestingWarehouseId: userWarehouseId },
        { sourceWarehouseId: userWarehouseId },
      ];
    }
  } else {
    // Admins see all, warehouse users see their own and claims
    if (userRole === "WAREHOUSE") {
      whereClause.OR = [
        { requestingWarehouseId: userWarehouseId },
        { sourceWarehouseId: userWarehouseId },
        { status: StockRequestStatus.PENDING },
      ];
    }
  }

  return prisma.stockRequest.findMany({
    where: whereClause,
    include: {
      requester: { select: { id: true, fullName: true, username: true } },
      sourceUser: { select: { id: true, fullName: true, username: true } },
      requestingWarehouse: true,
      sourceWarehouse: true,
      items: {
        include: {
          materialVariant: {
            include: {
              material: { select: { name: true } }
            }
          },
          packagingVersion: {
            include: {
              packagingConfiguration: { select: { name: true, unitLabel: true } }
            }
          }
        }
      },
      stockTransfer: true,
    },
    orderBy: { createdAt: "desc" },
  });
};
