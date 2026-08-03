import { PrismaClient, StockTransferStatus, StockMovementType, StockReferenceType } from "@prisma/client";

export async function seedTransfers(prisma: PrismaClient) {
  console.log("Seeding Warehouse Transfers...");

  const mainWh = await prisma.warehouse.findUnique({ where: { code: "WH-MAIN" } });
  const kitchenWh = await prisma.warehouse.findUnique({ where: { code: "WH-KITCHEN" } });
  const warehouseUser = await prisma.user.findUnique({ where: { username: "warehouse" } });
  const kitchenUser = await prisma.user.findUnique({ where: { username: "kitchen1" } });

  if (!mainWh || !kitchenWh || !warehouseUser || !kitchenUser) {
    throw new Error("Required warehouses or users for transfers not found.");
  }

  // Items to transfer
  const itemsToTransfer = [
    { sku: "RM-POP-KERNEL", qty: 10 },
    { sku: "RM-BUTTER", qty: 5 },
    { sku: "PK-CUP-MD", qty: 50 },
    { sku: "FG-COLA-LG", qty: 20 },
  ];

  // 1. Create StockTransfer record
  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNumber: "TRF-2026-0001",
      sourceWarehouseId: mainWh.id,
      destinationWarehouseId: kitchenWh.id,
      requestedById: kitchenUser.id,
      sourceResponsibleUserId: warehouseUser.id,
      destinationResponsibleUserId: kitchenUser.id,
      completedById: warehouseUser.id,
      completedAt: new Date(),
      status: StockTransferStatus.COMPLETED,
      remarks: "Replenishment for daily kitchen operation",
    },
  });

  for (const item of itemsToTransfer) {
    const product = await prisma.product.findUnique({ where: { sku: item.sku } });
    if (!product) continue;

    // Create StockTransferItem
    await prisma.stockTransferItem.create({
      data: {
        transferId: transfer.id,
        productId: product.id,
        quantity: item.qty,
      },
    });

    // Handle Stock adjustments for TRANSFER_OUT (Main Warehouse)
    const mainStock = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: mainWh.id, productId: product.id } },
    });
    const mainQtyBefore = mainStock ? Number(mainStock.quantity) : 0;
    const mainQtyAfter = mainQtyBefore - item.qty;

    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: mainWh.id, productId: product.id } },
      update: { quantity: mainQtyAfter },
      create: { warehouseId: mainWh.id, productId: product.id, quantity: mainQtyAfter },
    });

    await prisma.stockLedger.create({
      data: {
        warehouseId: mainWh.id,
        productId: product.id,
        movementType: StockMovementType.TRANSFER_OUT,
        quantity: -item.qty,
        quantityBefore: mainQtyBefore,
        quantityAfter: mainQtyAfter,
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        remarks: `Transferred to ${kitchenWh.name}`,
        createdById: warehouseUser.id,
      },
    });

    // Handle Stock adjustments for TRANSFER_IN (Kitchen Storage)
    const kitchenStock = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: kitchenWh.id, productId: product.id } },
    });
    const kitchenQtyBefore = kitchenStock ? Number(kitchenStock.quantity) : 0;
    const kitchenQtyAfter = kitchenQtyBefore + item.qty;

    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: kitchenWh.id, productId: product.id } },
      update: { quantity: kitchenQtyAfter },
      create: { warehouseId: kitchenWh.id, productId: product.id, quantity: kitchenQtyAfter },
    });

    await prisma.stockLedger.create({
      data: {
        warehouseId: kitchenWh.id,
        productId: product.id,
        movementType: StockMovementType.TRANSFER_IN,
        quantity: item.qty,
        quantityBefore: kitchenQtyBefore,
        quantityAfter: kitchenQtyAfter,
        referenceType: StockReferenceType.TRANSFER,
        referenceId: transfer.id,
        remarks: `Transferred from ${mainWh.name}`,
        createdById: kitchenUser.id,
      },
    });
  }

  console.log("Seeded stock transfer and updated ledger entries.");
}
