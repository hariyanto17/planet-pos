import { PrismaClient, InventoryType } from "@prisma/client";

export async function seedProducts(prisma: PrismaClient) {
  console.log("Seeding Products...");

  // Fetch categories and units
  const categories = await prisma.category.findMany();
  const units = await prisma.unit.findMany();

  const getCategoryId = (name: string) => categories.find((c) => c.name === name)?.id || "";
  const getUnitId = (symbol: string) => units.find((u) => u.symbol === symbol)?.id || null;

  // Prepare products to seed
  const productsToSeed = [
    // --- Finished Goods ---
    {
      sku: "FG-SALT-POP",
      name: "Salted Popcorn",
      categoryName: "Popcorn",
      price: 45000,
      trackInventory: true,
      inventoryType: InventoryType.FINISHED_GOOD,
      unitSymbol: "PCS",
      minimumStock: 10,
    },
    {
      sku: "FG-CARM-POP",
      name: "Caramel Popcorn",
      categoryName: "Popcorn",
      price: 55000,
      trackInventory: true,
      inventoryType: InventoryType.FINISHED_GOOD,
      unitSymbol: "PCS",
      minimumStock: 10,
    },
    {
      sku: "FG-COLA-LG",
      name: "Large Cola",
      categoryName: "Beverages",
      price: 25000,
      trackInventory: true,
      inventoryType: InventoryType.FINISHED_GOOD,
      unitSymbol: "PCS",
      minimumStock: 20,
    },
    {
      sku: "FG-MINERAL-WAT",
      name: "Mineral Water",
      categoryName: "Beverages",
      price: 15000,
      trackInventory: true,
      inventoryType: InventoryType.FINISHED_GOOD,
      unitSymbol: "BOTTLE",
      minimumStock: 15,
    },
    {
      sku: "FG-HOT-COFFEE",
      name: "Hot Coffee",
      categoryName: "Beverages",
      price: 30000,
      trackInventory: false, // Non-inventory tracked finished good (made dynamically)
      inventoryType: InventoryType.FINISHED_GOOD,
      unitSymbol: "PCS",
      minimumStock: 0,
    },
    {
      sku: "FG-VANILLA-ICE",
      name: "Vanilla Ice Cream",
      categoryName: "Ice Cream",
      price: 35000,
      trackInventory: true,
      inventoryType: InventoryType.FINISHED_GOOD,
      unitSymbol: "PCS",
      minimumStock: 10,
    },
    {
      sku: "FG-COMBO-CINEMA",
      name: "Cinema Combo Special",
      categoryName: "Combo",
      price: 85000,
      trackInventory: false, // Combo deals are not tracked individually as stock
      inventoryType: InventoryType.FINISHED_GOOD,
      unitSymbol: "PCS",
      minimumStock: 0,
    },

    // --- Raw Materials ---
    {
      sku: "RM-POP-KERNEL",
      name: "Popcorn Kernel",
      categoryName: "Kitchen",
      price: 0, // Raw materials don't have selling price
      trackInventory: true,
      inventoryType: InventoryType.RAW_MATERIAL,
      unitSymbol: "KG",
      minimumStock: 20,
    },
    {
      sku: "RM-COOKING-OIL",
      name: "Cooking Oil",
      categoryName: "Kitchen",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.RAW_MATERIAL,
      unitSymbol: "LITER",
      minimumStock: 10,
    },
    {
      sku: "RM-BUTTER",
      name: "Butter",
      categoryName: "Kitchen",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.RAW_MATERIAL,
      unitSymbol: "KG",
      minimumStock: 5,
    },
    {
      sku: "RM-CARAMEL-SYRUP",
      name: "Caramel Syrup",
      categoryName: "Kitchen",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.RAW_MATERIAL,
      unitSymbol: "LITER",
      minimumStock: 5,
    },
    {
      sku: "RM-SUGAR",
      name: "Sugar",
      categoryName: "Kitchen",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.RAW_MATERIAL,
      unitSymbol: "KG",
      minimumStock: 5,
    },
    {
      sku: "RM-COFFEE-BEAN",
      name: "Coffee Bean",
      categoryName: "Kitchen",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.RAW_MATERIAL,
      unitSymbol: "KG",
      minimumStock: 5,
    },
    {
      sku: "RM-MILK",
      name: "Milk",
      categoryName: "Kitchen",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.RAW_MATERIAL,
      unitSymbol: "LITER",
      minimumStock: 5,
    },

    // --- Packaging ---
    {
      sku: "PK-CUP-LG",
      name: "Large Cup",
      categoryName: "Snack",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.PACKAGING,
      unitSymbol: "PCS",
      minimumStock: 100,
    },
    {
      sku: "PK-CUP-MD",
      name: "Medium Cup",
      categoryName: "Snack",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.PACKAGING,
      unitSymbol: "PCS",
      minimumStock: 100,
    },
    {
      sku: "PK-POP-BUCKET",
      name: "Popcorn Bucket",
      categoryName: "Snack",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.PACKAGING,
      unitSymbol: "PCS",
      minimumStock: 50,
    },
    {
      sku: "PK-PAPER-BAG",
      name: "Paper Bag",
      categoryName: "Snack",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.PACKAGING,
      unitSymbol: "PCS",
      minimumStock: 150,
    },
    {
      sku: "PK-PLASTIC-SPOON",
      name: "Plastic Spoon",
      categoryName: "Snack",
      price: 0,
      trackInventory: true,
      inventoryType: InventoryType.PACKAGING,
      unitSymbol: "PCS",
      minimumStock: 100,
    },
  ];

  const seededProducts = [];
  for (const p of productsToSeed) {
    const categoryId = getCategoryId(p.categoryName);
    const unitId = p.unitSymbol ? getUnitId(p.unitSymbol) : null;

    if (!categoryId) {
      throw new Error(`Category not found for product: ${p.name}`);
    }

    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        categoryId,
        name: p.name,
        price: p.price,
        trackInventory: p.trackInventory,
        inventoryType: p.inventoryType,
        unitId,
        minimumStock: p.minimumStock,
        isActive: true,
      },
      create: {
        sku: p.sku,
        categoryId,
        name: p.name,
        price: p.price,
        trackInventory: p.trackInventory,
        inventoryType: p.inventoryType,
        unitId,
        minimumStock: p.minimumStock,
        isActive: true,
      },
    });
    seededProducts.push(product);
  }

  console.log(`Seeded ${seededProducts.length} products successfully.`);
  return seededProducts;
}
