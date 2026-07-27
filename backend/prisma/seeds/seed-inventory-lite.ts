import { PrismaClient, StockMovementType, StockReferenceType, InventoryType } from "@prisma/client";
import { createLedgerEntry } from "../../src/modules/inventory/stock.service";

const prisma = new PrismaClient();

async function main() {
  console.log("=== STARTING INVENTORY LITE SEEDING ===");

  // 1. Seed Warehouses
  const warehousesToSeed = [
    { code: "MAIN", name: "Main Warehouse" },
    { code: "CONCESSION", name: "Concession Store" },
    { code: "KITCHEN", name: "Main Kitchen" },
    { code: "FREEZER", name: "Walk-in Freezer" },
  ];

  const warehousesMap: { [code: string]: string } = {};

  for (const w of warehousesToSeed) {
    const warehouse = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, isActive: true },
      create: { code: w.code, name: w.name, isActive: true },
    });
    warehousesMap[w.code] = warehouse.id;
    console.log(`Seeded warehouse: ${warehouse.name} (${warehouse.code})`);
  }

  // 2. Seed Units
  const unitsToSeed = [
    { symbol: "PCS", name: "Pieces" },
    { symbol: "Bottle", name: "Bottles" },
    { symbol: "Cup", name: "Cups" },
    { symbol: "Can", name: "Cans" },
    { symbol: "Pack", name: "Packs" },
    { symbol: "Kg", name: "Kilograms" },
    { symbol: "Gram", name: "Grams" },
    { symbol: "Liter", name: "Liters" },
    { symbol: "mL", name: "Milliliters" },
  ];

  const unitsMap: { [symbol: string]: string } = {};

  for (const u of unitsToSeed) {
    const unit = await prisma.unit.upsert({
      where: { symbol: u.symbol },
      update: { name: u.name, isActive: true },
      create: { symbol: u.symbol, name: u.name, isActive: true },
    });
    unitsMap[u.symbol] = unit.id;
    console.log(`Seeded unit: ${unit.name} (${unit.symbol})`);
  }

  // 3. Find some baseline seeded products
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    take: 10,
  });

  if (products.length === 0) {
    console.log("No products found to link. Please run standard user/product seeder first.");
    process.exit(0);
  }

  // Get admin user context for createdBy
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  console.log("Enabling inventory tracking and creating opening stock ledgers...");

  for (const p of products) {
    const isDrink = p.sku?.startsWith("DRNK");
    const unitSymbol = isDrink ? "Bottle" : "PCS";
    const unitId = unitsMap[unitSymbol] || unitsMap["PCS"];

    // Update product to support WMS
    const updatedProduct = await prisma.product.update({
      where: { id: p.id },
      data: {
        trackInventory: true,
        inventoryType: InventoryType.FINISHED_GOOD,
        minimumStock: 15.0,
        unitId,
      },
    });

    console.log(`Configured product: ${updatedProduct.name} (Tracked: true)`);

    // Create opening stock inside MAIN warehouse (+100)
    await prisma.$transaction(async (tx) => {
      await createLedgerEntry(tx, {
        productId: p.id,
        warehouseId: warehousesMap["MAIN"],
        movementType: StockMovementType.OPENING,
        quantity: 100.0,
        referenceType: StockReferenceType.OPENING,
        remarks: "Seed opening stock initialization",
        createdById: adminUser?.id || null,
      });
    });

    // Create opening stock inside CONCESSION warehouse (+50)
    await prisma.$transaction(async (tx) => {
      await createLedgerEntry(tx, {
        productId: p.id,
        warehouseId: warehousesMap["CONCESSION"],
        movementType: StockMovementType.OPENING,
        quantity: 50.0,
        referenceType: StockReferenceType.OPENING,
        remarks: "Seed opening stock initialization",
        createdById: adminUser?.id || null,
      });
    });

    console.log(`Created opening stock entries for: ${p.name} (MAIN: +100, CONCESSION: +50)`);
  }

  console.log("=== INVENTORY LITE SEEDING COMPLETED SUCCESSFUL ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
