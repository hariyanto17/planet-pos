import { PrismaClient, StockMovementType, StockReferenceType } from "@prisma/client";

export async function seedOpeningStock(prisma: PrismaClient) {
  console.log("Seeding Opening Stock...");

  const mainWh = await prisma.warehouse.findUnique({ where: { code: "WH-MAIN" } });
  const kitchenWh = await prisma.warehouse.findUnique({ where: { code: "WH-KITCHEN" } });
  const warehouseUser = await prisma.user.findUnique({ where: { username: "warehouse" } });

  if (!mainWh || !kitchenWh || !warehouseUser) {
    throw new Error("Required warehouses or user for opening stock not found.");
  }

  // Define opening stock values
  const stockMap: Record<string, { main: number; kitchen: number }> = {
    "RM-POP-KERNEL": { main: 100, kitchen: 20 },
    "RM-BUTTER": { main: 50, kitchen: 5 },
    "RM-COOKING-OIL": { main: 50, kitchen: 10 },
    "RM-CARAMEL-SYRUP": { main: 30, kitchen: 5 },
    "RM-SUGAR": { main: 40, kitchen: 5 },
    "RM-COFFEE-BEAN": { main: 20, kitchen: 2 },
    "RM-MILK": { main: 30, kitchen: 5 },
    "PK-CUP-LG": { main: 500, kitchen: 100 },
    "PK-CUP-MD": { main: 500, kitchen: 100 },
    "PK-POP-BUCKET": { main: 300, kitchen: 50 },
    "PK-PAPER-BAG": { main: 400, kitchen: 80 },
    "PK-PLASTIC-SPOON": { main: 300, kitchen: 50 },
    "FG-COLA-LG": { main: 200, kitchen: 40 },
    "FG-MINERAL-WAT": { main: 150, kitchen: 30 },
    "FG-SALT-POP": { main: 50, kitchen: 10 },
    "FG-CARM-POP": { main: 50, kitchen: 10 },
    "FG-VANILLA-ICE": { main: 80, kitchen: 15 },
  };

  const inventoryProducts = await prisma.product.findMany({
    where: { trackInventory: true },
  });

  let openingStocksCount = 0;

  for (const product of inventoryProducts) {
    const allocations = stockMap[product.sku || ""] || { main: 10, kitchen: 2 };

    const targets = [
      { wh: mainWh, qty: allocations.main },
      { wh: kitchenWh, qty: allocations.kitchen },
    ];

    for (const target of targets) {
      // Create/Update WarehouseStock
      await prisma.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: target.wh.id,
            productId: product.id,
          },
        },
        update: {
          quantity: target.qty,
        },
        create: {
          warehouseId: target.wh.id,
          productId: product.id,
          quantity: target.qty,
        },
      });

      // Create StockLedger Entry
      await prisma.stockLedger.create({
        data: {
          warehouseId: target.wh.id,
          productId: product.id,
          movementType: StockMovementType.OPENING,
          quantity: target.qty,
          quantityBefore: 0,
          quantityAfter: target.qty,
          referenceType: StockReferenceType.OPENING,
          remarks: "Initial opening stock",
          createdById: warehouseUser.id,
        },
      });

      openingStocksCount++;
    }
  }

  console.log(`Seeded ${openingStocksCount} opening stock entries.`);
}
