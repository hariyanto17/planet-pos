import { PrismaClient, WarehouseType, BaseUnit, StockMovementType, StockReferenceType } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";

export async function seedCanonical(prisma: PrismaClient) {
  console.log("Seeding Canonical Model (Clearing products/materials, ensuring Warehouses and Categories)...");

  // Clean up existing product, recipe, material, stock, and transaction tables
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.promotionItem.deleteMany();
  await prisma.sellableProduct.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.stockRequestItem.deleteMany();
  await prisma.stockRequest.deleteMany();
  await prisma.supplierOffer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.materialVariant.deleteMany();
  await prisma.material.deleteMany();

  // 1. Ensure Default Warehouses
  const kitchenWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_KITCHEN" },
    update: { name: "Kitchen Storage", warehouseType: WarehouseType.KITCHEN_STORAGE, isActive: true, isDefaultKitchenStorage: true },
    create: { code: "WH_KITCHEN", name: "Kitchen Storage", warehouseType: WarehouseType.KITCHEN_STORAGE, isActive: true, isDefaultKitchenStorage: true },
  });

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_MAIN" },
    update: { name: "Main Warehouse", warehouseType: WarehouseType.SALES, isActive: true },
    create: { code: "WH_MAIN", name: "Main Warehouse", warehouseType: WarehouseType.SALES, isActive: true },
  });

  // 2. Create or fetch Categories
  let catBeverageIngredients = await prisma.category.findFirst({ where: { name: "Bahan Minuman" } });
  if (!catBeverageIngredients) {
    catBeverageIngredients = await prisma.category.create({ data: { name: "Bahan Minuman", isActive: true } });
  }

  let catBeverages = await prisma.category.findFirst({ where: { name: "Minuman" } });
  if (!catBeverages) {
    catBeverages = await prisma.category.create({ data: { name: "Minuman", isActive: true } });
  }

  let catPackaging = await prisma.category.findFirst({ where: { name: "Kemasan" } });
  if (!catPackaging) {
    catPackaging = await prisma.category.create({ data: { name: "Kemasan", isActive: true } });
  }

  console.log("✅ Canonical seed completed successfully with empty products/materials!");
}
