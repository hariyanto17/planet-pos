import { PrismaClient, WarehouseType } from "@prisma/client";

export async function seedWarehouses(prisma: PrismaClient) {
  console.log("Seeding Warehouses...");

  const warehousesToSeed = [
    {
      code: "WH-MAIN",
      name: "Main Warehouse",
      warehouseType: WarehouseType.GENERAL,
      isDefaultKitchenStorage: false,
    },
    {
      code: "WH-KITCHEN",
      name: "Kitchen Storage",
      warehouseType: WarehouseType.KITCHEN_STORAGE,
      isDefaultKitchenStorage: true,
    },
  ];

  const seededWarehouses = [];
  for (const w of warehousesToSeed) {
    const warehouse = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: {
        name: w.name,
        warehouseType: w.warehouseType,
        isDefaultKitchenStorage: w.isDefaultKitchenStorage,
        isActive: true,
      },
      create: {
        code: w.code,
        name: w.name,
        warehouseType: w.warehouseType,
        isDefaultKitchenStorage: w.isDefaultKitchenStorage,
        isActive: true,
      },
    });
    seededWarehouses.push(warehouse);
  }

  console.log(`Seeded ${seededWarehouses.length} warehouses successfully.`);
  return seededWarehouses;
}
