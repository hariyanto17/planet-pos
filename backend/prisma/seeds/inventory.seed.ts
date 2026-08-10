import { PrismaClient, InventoryType, WarehouseType, StockMovementType, StockReferenceType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export async function seedInventory(prisma: PrismaClient) {
  console.log("Seeding Inventory (Categories, Products, Recipes, Warehouses, and Stocks)...");

  // 1. Ensure Default Warehouses
  const kitchenWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_KITCHEN" },
    update: { name: "Kitchen Storage", warehouseType: WarehouseType.KITCHEN_STORAGE, isActive: true, isDefaultKitchenStorage: true },
    create: { code: "WH_KITCHEN", name: "Kitchen Storage", warehouseType: WarehouseType.KITCHEN_STORAGE, isActive: true, isDefaultKitchenStorage: true },
  });

  const concessionWarehouse = await prisma.warehouse.upsert({
    where: { code: "CONCESSION" },
    update: { name: "Concession Warehouse", warehouseType: WarehouseType.SALES, isActive: true },
    create: { code: "CONCESSION", name: "Concession Warehouse", warehouseType: WarehouseType.SALES, isActive: true },
  });

  // 2. Fetch required Units
  const unitMl = await prisma.unit.findUnique({ where: { symbol: "ML" } });
  const unitGram = await prisma.unit.findUnique({ where: { symbol: "GRAM" } });
  const unitPcs = await prisma.unit.findUnique({ where: { symbol: "PCS" } });
  const unitBottle = await prisma.unit.findUnique({ where: { symbol: "BOTTLE" } });

  if (!unitMl || !unitGram || !unitPcs || !unitBottle) {
    throw new Error("Required units (ML, GRAM, PCS, BOTTLE) are missing from the database. Make sure units seed is run first.");
  }

  // 3. Upsert Categories
  const catBahanMinuman = await prisma.category.create({ data: { name: "Bahan Minuman", isActive: true } });
  const catBahanMakanan = await prisma.category.create({ data: { name: "Bahan Makanan", isActive: true } });
  const catPackaging = await prisma.category.create({ data: { name: "Kemasan Minuman", isActive: true } });
  const catMinuman = await prisma.category.create({ data: { name: "Minuman", isActive: true } });

  // Helper function to create product and set initial stock
  const createProductWithStock = async (params: {
    name: string;
    sku: string;
    categoryId: string;
    unitId: string;
    inventoryType: InventoryType;
    trackInventory: boolean;
    price: number;
    cost: number;
    initialStock: number;
    warehouseId: string;
  }) => {
    const product = await prisma.product.create({
      data: {
        name: params.name,
        sku: params.sku,
        categoryId: params.categoryId,
        unitId: params.unitId,
        inventoryType: params.inventoryType,
        trackInventory: params.trackInventory,
        price: new Decimal(params.price),
        cost: new Decimal(params.cost),
        isActive: true,
      },
    });

    if (params.trackInventory && params.initialStock > 0) {
      // 1. Create WarehouseStock
      await prisma.warehouseStock.create({
        data: {
          warehouseId: params.warehouseId,
          productId: product.id,
          quantity: new Decimal(params.initialStock),
        },
      });

      // 2. Create StockLedger
      await prisma.stockLedger.create({
        data: {
          warehouseId: params.warehouseId,
          productId: product.id,
          movementType: StockMovementType.OPENING,
          quantity: new Decimal(params.initialStock),
          quantityBefore: new Decimal(0),
          quantityAfter: new Decimal(params.initialStock),
          referenceType: StockReferenceType.OPENING,
          remarks: "Initial opening stock from seeder",
        },
      });
    }

    return product;
  };

  // 4. Seed Raw Materials
  // Category: Bahan Minuman
  const sirupGula = await createProductWithStock({
    name: "Sirup Gula",
    sku: "RM-SR-GULA",
    categoryId: catBahanMinuman.id,
    unitId: unitMl.id,
    inventoryType: InventoryType.RAW_MATERIAL,
    trackInventory: true,
    price: 0,
    cost: 10, // dummy cost per ml
    initialStock: 10000,
    warehouseId: kitchenWarehouse.id,
  });

  const bubukTeh = await createProductWithStock({
    name: "Bubuk Teh",
    sku: "RM-BB-TEH",
    categoryId: catBahanMinuman.id,
    unitId: unitGram.id,
    inventoryType: InventoryType.RAW_MATERIAL,
    trackInventory: true,
    price: 0,
    cost: 50, // dummy cost per gram
    initialStock: 2000,
    warehouseId: kitchenWarehouse.id,
  });

  const bubukKopi = await createProductWithStock({
    name: "Bubuk Kopi",
    sku: "RM-BB-KOPI",
    categoryId: catBahanMinuman.id,
    unitId: unitGram.id,
    inventoryType: InventoryType.RAW_MATERIAL,
    trackInventory: true,
    price: 0,
    cost: 150, // dummy cost per gram
    initialStock: 1000,
    warehouseId: kitchenWarehouse.id,
  });

  // Category: Bahan Makanan
  await createProductWithStock({
    name: "Kentang Frozen",
    sku: "RM-KT-FROZEN",
    categoryId: catBahanMakanan.id,
    unitId: unitGram.id,
    inventoryType: InventoryType.RAW_MATERIAL,
    trackInventory: true,
    price: 0,
    cost: 40,
    initialStock: 10000,
    warehouseId: kitchenWarehouse.id,
  });

  await createProductWithStock({
    name: "Minyak Goreng",
    sku: "RM-MY-GORENG",
    categoryId: catBahanMakanan.id,
    unitId: unitMl.id,
    inventoryType: InventoryType.RAW_MATERIAL,
    trackInventory: true,
    price: 0,
    cost: 20,
    initialStock: 5000,
    warehouseId: kitchenWarehouse.id,
  });

  // 5. Seed Packaging (Category: Kemasan Minuman)
  const cupPlastik = await createProductWithStock({
    name: "Cup Plastik 16 oz",
    sku: "PC-CUP-16OZ",
    categoryId: catPackaging.id,
    unitId: unitPcs.id,
    inventoryType: InventoryType.PACKAGING,
    trackInventory: true,
    price: 0,
    cost: 500,
    initialStock: 1000,
    warehouseId: kitchenWarehouse.id,
  });

  const tutupCup = await createProductWithStock({
    name: "Tutup Cup 16 oz",
    sku: "PC-TUTUP-16OZ",
    categoryId: catPackaging.id,
    unitId: unitPcs.id,
    inventoryType: InventoryType.PACKAGING,
    trackInventory: true,
    price: 0,
    cost: 200,
    initialStock: 1000,
    warehouseId: kitchenWarehouse.id,
  });

  // 6. Seed Finished Goods with Recipe (Category: Minuman)
  // Product 1 — Es Teh Manis
  const esTehManis = await createProductWithStock({
    name: "Es Teh Manis",
    sku: "FG-TEH-MANIS",
    categoryId: catMinuman.id,
    unitId: unitPcs.id,
    inventoryType: InventoryType.FINISHED_GOOD,
    trackInventory: true,
    price: 15000,
    cost: 1500, // estimated recipe cost
    initialStock: 0, // recipe based, no initial physical stock of FG
    warehouseId: concessionWarehouse.id,
  });

  const recipeTeh = await prisma.recipe.create({
    data: { productId: esTehManis.id },
  });

  await prisma.recipeItem.createMany({
    data: [
      { recipeId: recipeTeh.id, componentProductId: bubukTeh.id, quantity: new Decimal(10), unitId: unitGram.id },
      { recipeId: recipeTeh.id, componentProductId: sirupGula.id, quantity: new Decimal(20), unitId: unitMl.id },
      { recipeId: recipeTeh.id, componentProductId: cupPlastik.id, quantity: new Decimal(1), unitId: unitPcs.id },
      { recipeId: recipeTeh.id, componentProductId: tutupCup.id, quantity: new Decimal(1), unitId: unitPcs.id },
    ],
  });

  // Product 2 — Kopi Susu
  const kopiSusu = await createProductWithStock({
    name: "Kopi Susu",
    sku: "FG-KOPI-SUSU",
    categoryId: catMinuman.id,
    unitId: unitPcs.id,
    inventoryType: InventoryType.FINISHED_GOOD,
    trackInventory: true,
    price: 20000,
    cost: 3200,
    initialStock: 0,
    warehouseId: concessionWarehouse.id,
  });

  const recipeKopi = await prisma.recipe.create({
    data: { productId: kopiSusu.id },
  });

  await prisma.recipeItem.createMany({
    data: [
      { recipeId: recipeKopi.id, componentProductId: bubukKopi.id, quantity: new Decimal(15), unitId: unitGram.id },
      { recipeId: recipeKopi.id, componentProductId: sirupGula.id, quantity: new Decimal(20), unitId: unitMl.id },
      { recipeId: recipeKopi.id, componentProductId: cupPlastik.id, quantity: new Decimal(1), unitId: unitPcs.id },
      { recipeId: recipeKopi.id, componentProductId: tutupCup.id, quantity: new Decimal(1), unitId: unitPcs.id },
    ],
  });

  // 7. Seed Finished Goods without Recipe (Category: Minuman)
  await createProductWithStock({
    name: "Air Mineral 600ml",
    sku: "FG-AM-600ML",
    categoryId: catMinuman.id,
    unitId: unitBottle.id,
    inventoryType: InventoryType.FINISHED_GOOD,
    trackInventory: true,
    price: 5000,
    cost: 2000,
    initialStock: 100,
    warehouseId: concessionWarehouse.id,
  });

  await createProductWithStock({
    name: "Air Mineral 1.500ml",
    sku: "FG-AM-1500ML",
    categoryId: catMinuman.id,
    unitId: unitBottle.id,
    inventoryType: InventoryType.FINISHED_GOOD,
    trackInventory: true,
    price: 10000,
    cost: 4000,
    initialStock: 50,
    warehouseId: concessionWarehouse.id,
  });

  await createProductWithStock({
    name: "Teh Botol",
    sku: "FG-TEH-BOTOL",
    categoryId: catMinuman.id,
    unitId: unitBottle.id,
    inventoryType: InventoryType.FINISHED_GOOD,
    trackInventory: true,
    price: 8000,
    cost: 3000,
    initialStock: 75,
    warehouseId: concessionWarehouse.id,
  });

  console.log("Seeding Inventory completed successfully!");
}
