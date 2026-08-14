import { PrismaClient, WarehouseType, BaseUnit, StockMovementType, StockReferenceType } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";

export async function seedCanonical(prisma: PrismaClient) {
  console.log("Seeding Canonical Model (Materials, MaterialVariants, SellableProducts, Recipes, Warehouses, Stocks)...");

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

  // 3. Create Materials (raw materials / ingredients)
  console.log("  Creating Materials...");

  const sugarSyrup = await prisma.material.create({
    data: {
      name: "Sugar Syrup",
      categoryId: catBeverageIngredients.id,
      isActive: true,
    },
  }).catch(() => prisma.material.findFirst({ where: { name: "Sugar Syrup" } })) as any;

  const teaPowder = await prisma.material.create({
    data: {
      name: "Tea Powder",
      categoryId: catBeverageIngredients.id,
      isActive: true,
    },
  }).catch(() => prisma.material.findFirst({ where: { name: "Tea Powder" } })) as any;

  const coffeePowder = await prisma.material.create({
    data: {
      name: "Coffee Powder",
      categoryId: catBeverageIngredients.id,
      isActive: true,
    },
  }).catch(() => prisma.material.findFirst({ where: { name: "Coffee Powder" } })) as any;

  const cup = await prisma.material.create({
    data: {
      name: "Cup 250ML",
      categoryId: catPackaging.id,
      isActive: true,
    },
  }).catch(() => prisma.material.findFirst({ where: { name: "Cup 250ML" } })) as any;

  // 4. Create MaterialVariants with stock
  console.log("  Creating MaterialVariants...");

  const sugarSyrupML = await prisma.materialVariant.create({
    data: {
      sku: "VAR-SYRUP-ML",
      name: "Sugar Syrup (ML)",
      materialId: sugarSyrup.id,
      baseUnit: BaseUnit.ML,
      isActive: true,
    },
  }).catch(() => prisma.materialVariant.findFirst({ where: { sku: "VAR-SYRUP-ML" } })) as any;

  const teaPowderG = await prisma.materialVariant.create({
    data: {
      sku: "VAR-TEA-G",
      name: "Tea Powder (G)",
      materialId: teaPowder.id,
      baseUnit: BaseUnit.G,
      isActive: true,
    },
  }).catch(() => prisma.materialVariant.findFirst({ where: { sku: "VAR-TEA-G" } })) as any;

  const coffeePowderG = await prisma.materialVariant.create({
    data: {
      sku: "VAR-COFFEE-G",
      name: "Coffee Powder (G)",
      materialId: coffeePowder.id,
      baseUnit: BaseUnit.G,
      isActive: true,
    },
  }).catch(() => prisma.materialVariant.findFirst({ where: { sku: "VAR-COFFEE-G" } })) as any;

  const cupPcs = await prisma.materialVariant.create({
    data: {
      sku: "VAR-CUP-PCS",
      name: "Cup (PCS)",
      materialId: cup.id,
      baseUnit: BaseUnit.PCS,
      isActive: true,
    },
  }).catch(() => prisma.materialVariant.findFirst({ where: { sku: "VAR-CUP-PCS" } })) as any;

  // 5. Initialize InventoryStock for MaterialVariants
  console.log("  Initializing inventory stock...");

  const createOrUpdateInventoryStock = async (materialVariantId: string, warehouseId: string, quantity: number) => {
    await prisma.inventoryStock.upsert({
      where: { warehouseId_materialVariantId: { materialVariantId, warehouseId } },
      update: { quantity: new Decimal(quantity) },
      create: { materialVariantId, warehouseId, quantity: new Decimal(quantity) },
    });
  };

  // Initialize kitchen warehouse stock
  await createOrUpdateInventoryStock(sugarSyrupML.id, kitchenWarehouse.id, 10000);
  await createOrUpdateInventoryStock(teaPowderG.id, kitchenWarehouse.id, 2000);
  await createOrUpdateInventoryStock(coffeePowderG.id, kitchenWarehouse.id, 1000);
  await createOrUpdateInventoryStock(cupPcs.id, kitchenWarehouse.id, 5000);

  // Initialize main warehouse stock
  await createOrUpdateInventoryStock(sugarSyrupML.id, mainWarehouse.id, 5000);
  await createOrUpdateInventoryStock(teaPowderG.id, mainWarehouse.id, 1000);
  await createOrUpdateInventoryStock(coffeePowderG.id, mainWarehouse.id, 500);
  await createOrUpdateInventoryStock(cupPcs.id, mainWarehouse.id, 3000);

  // 6. Create SellableProducts (with direct-sale variants)
  console.log("  Creating SellableProducts...");

  const teaProduct = await prisma.sellableProduct.create({
    data: {
      sku: "PROD-TEA-250",
      name: "Iced Tea",
      categoryId: catBeverages.id,
      price: new Decimal(15000),
      productType: "RECIPE_BASED",
      isActive: true,
    },
  }).catch(() => prisma.sellableProduct.findFirst({ where: { sku: "PROD-TEA-250" } })) as any;

  const coffeeProduct = await prisma.sellableProduct.create({
    data: {
      sku: "PROD-COFFEE-250",
      name: "Iced Coffee",
      categoryId: catBeverages.id,
      price: new Decimal(18000),
      productType: "RECIPE_BASED",
      isActive: true,
    },
  }).catch(() => prisma.sellableProduct.findFirst({ where: { sku: "PROD-COFFEE-250" } })) as any;

  const directSaleTeaProduct = await prisma.sellableProduct.create({
    data: {
      sku: "PROD-TEA-DIRECT",
      name: "Ready Tea",
      categoryId: catBeverages.id,
      price: new Decimal(12000),
      productType: "DIRECT_SALE",
      directSaleMaterialVariantId: teaPowderG.id,
      isActive: true,
    },
  }).catch(() => prisma.sellableProduct.findFirst({ where: { sku: "PROD-TEA-DIRECT" } })) as any;

  // 7. Create Recipes
  console.log("  Creating Recipes...");

  const teaRecipe = await prisma.recipe.upsert({
    where: { sellableProductId: teaProduct.id },
    update: { isActive: true },
    create: {
      sellableProductId: teaProduct.id,
      isActive: true,
    },
  });

  const coffeeRecipe = await prisma.recipe.upsert({
    where: { sellableProductId: coffeeProduct.id },
    update: { isActive: true },
    create: {
      sellableProductId: coffeeProduct.id,
      isActive: true,
    },
  });

  // 8. Create RecipeItems (ingredients)
  console.log("  Creating RecipeItems...");

  // Tea: 3g tea powder + 100ml syrup + 1 cup
  await prisma.recipeItem.deleteMany({ where: { recipeId: teaRecipe.id } });
  await prisma.recipeItem.create({
    data: {
      recipeId: teaRecipe.id,
      materialVariantId: teaPowderG.id,
      quantity: new Decimal(3),
    },
  });
  await prisma.recipeItem.create({
    data: {
      recipeId: teaRecipe.id,
      materialVariantId: sugarSyrupML.id,
      quantity: new Decimal(100),
    },
  });
  await prisma.recipeItem.create({
    data: {
      recipeId: teaRecipe.id,
      materialVariantId: cupPcs.id,
      quantity: new Decimal(1),
    },
  });

  // Coffee: 15g coffee powder + 100ml syrup + 1 cup
  await prisma.recipeItem.deleteMany({ where: { recipeId: coffeeRecipe.id } });
  await prisma.recipeItem.create({
    data: {
      recipeId: coffeeRecipe.id,
      materialVariantId: coffeePowderG.id,
      quantity: new Decimal(15),
    },
  });
  await prisma.recipeItem.create({
    data: {
      recipeId: coffeeRecipe.id,
      materialVariantId: sugarSyrupML.id,
      quantity: new Decimal(100),
    },
  });
  await prisma.recipeItem.create({
    data: {
      recipeId: coffeeRecipe.id,
      materialVariantId: cupPcs.id,
      quantity: new Decimal(1),
    },
  });

  console.log("✅ Canonical seed completed successfully!");
  console.log(`
  Warehouses: ${kitchenWarehouse.name} (${kitchenWarehouse.code}), ${mainWarehouse.name} (${mainWarehouse.code})
  MaterialVariants: ${sugarSyrupML.name}, ${teaPowderG.name}, ${coffeePowderG.name}, ${cupPcs.name}
  SellableProducts: ${teaProduct.name} (Recipe), ${coffeeProduct.name} (Recipe), ${directSaleTeaProduct.name} (Direct)
  Recipes: Tea (${teaRecipe.id}), Coffee (${coffeeRecipe.id})
  `);
}
