import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, InventoryType } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { getProductStockList } from "./service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("POS Inventory All Warehouses and Specific Filters Tests", async (t) => {
  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: "Test Category" },
  });

  const unit = await prisma.unit.findFirst() || await prisma.unit.create({
    data: { name: "Pieces", symbol: "PCS" },
  });

  // Setup active warehouses
  const concessionWh = await prisma.warehouse.findFirst({ where: { code: "CONCESSION_TEST", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "CONCESSION_TEST", name: "Concession Store Test", warehouseType: "SALES", isActive: true },
    });

  const mainWh = await prisma.warehouse.findFirst({ where: { code: "MAIN_TEST", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "MAIN_TEST", name: "Main Warehouse Test", warehouseType: "SALES", isActive: true },
    });

  // Create a product: Cup Plastic
  const cup = await prisma.product.create({
    data: {
      name: "Cup Plastic Test",
      categoryId: category.id,
      inventoryType: InventoryType.RAW_MATERIAL,
      trackInventory: true,
      price: new Decimal(100),
      unitId: unit.id,
    },
  });

  // Set stock: Concession = 0, Main = 1000
  await prisma.warehouseStock.createMany({
    data: [
      { warehouseId: concessionWh.id, productId: cup.id, quantity: new Decimal(0) },
      { warehouseId: mainWh.id, productId: cup.id, quantity: new Decimal(1000) },
    ],
  });

  // Test 1: Filter specifically to Concession Warehouse
  await t.test("Test 1 — Filter: Concession Warehouse (expect stock 0)", async () => {
    const result = await getProductStockList({
      warehouseId: concessionWh.id,
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });
    const found = result.data.find((item: any) => item.name === "Cup Plastic Test");
    assert.ok(found);
    assert.equal(found.warehouseId, concessionWh.id);
    assert.equal(found.quantity, 0);
  });

  // Test 2: Filter specifically to Main Warehouse
  await t.test("Test 2 — Filter: Main Warehouse (expect stock 1000)", async () => {
    const result = await getProductStockList({
      warehouseId: mainWh.id,
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });
    const found = result.data.find((item: any) => item.name === "Cup Plastic Test");
    assert.ok(found);
    assert.equal(found.warehouseId, mainWh.id);
    assert.equal(found.quantity, 1000);
  });

  // Test 3: Filter: All Warehouses
  await t.test("Test 3 — Filter: All Warehouses (expect both records)", async () => {
    const activeWarehouses = await prisma.warehouse.findMany({ where: { isActive: true } });

    const result = await getProductStockList({
      warehouseId: "all",
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });
    const records = result.data.filter((item: any) => item.name === "Cup Plastic Test");
    assert.equal(records.length, activeWarehouses.length, `Should return ${activeWarehouses.length} warehouse records`);

    const concessionRecord = records.find((item: any) => item.warehouseId === concessionWh.id);
    const mainRecord = records.find((item: any) => item.warehouseId === mainWh.id);

    assert.ok(concessionRecord);
    assert.equal(concessionRecord.quantity, 0);

    assert.ok(mainRecord);
    assert.equal(mainRecord.quantity, 1000);
  });

  // Test 4: Add another warehouse (Warehouse B) with 500 stock
  await t.test("Test 4 — Filter: All Warehouses with a third warehouse", async () => {
    await prisma.warehouseStock.deleteMany({ where: { warehouse: { code: "WH_B_TEST" } } });
    await prisma.warehouse.deleteMany({ where: { code: "WH_B_TEST" } });

    const whB = await prisma.warehouse.create({
      data: { code: "WH_B_TEST", name: "Warehouse B Test", warehouseType: "SALES", isActive: true },
    });

    await prisma.warehouseStock.create({
      data: { warehouseId: whB.id, productId: cup.id, quantity: new Decimal(500) },
    });

    const activeWarehouses = await prisma.warehouse.findMany({ where: { isActive: true } });

    const result = await getProductStockList({
      warehouseId: "all",
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });

    const records = result.data.filter((item: any) => item.name === "Cup Plastic Test");
    assert.equal(records.length, activeWarehouses.length, "Should return all warehouse records including WH B");

    const recordB = records.find((item: any) => item.warehouseId === whB.id);
    assert.ok(recordB);
    assert.equal(recordB.quantity, 500);

    // Clean up
    await prisma.warehouseStock.delete({ where: { warehouseId_productId: { warehouseId: whB.id, productId: cup.id } } });
    await prisma.warehouse.delete({ where: { id: whB.id } });
  });

  // Test 5: All warehouses have zero
  await t.test("Test 5 — All warehouses have zero stock", async () => {
    const activeWarehouses = await prisma.warehouse.findMany({ where: { isActive: true } });

    // Set Main stock to 0
    await prisma.warehouseStock.update({
      where: { warehouseId_productId: { warehouseId: mainWh.id, productId: cup.id } },
      data: { quantity: new Decimal(0) },
    });

    const result = await getProductStockList({
      warehouseId: "all",
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });

    const records = result.data.filter((item: any) => item.name === "Cup Plastic Test");
    assert.equal(records.length, activeWarehouses.length, "All records must still be returned");

    const concessionRecord = records.find((item: any) => item.warehouseId === concessionWh.id);
    const mainRecord = records.find((item: any) => item.warehouseId === mainWh.id);

    assert.ok(concessionRecord);
    assert.equal(concessionRecord.quantity, 0);

    assert.ok(mainRecord);
    assert.equal(mainRecord.quantity, 0);
  });

  // Cleanup test items
  await prisma.warehouseStock.deleteMany({ where: { productId: cup.id } });
  await prisma.product.delete({ where: { id: cup.id } });
});
