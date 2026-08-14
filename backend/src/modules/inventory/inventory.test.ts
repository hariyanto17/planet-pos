import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { getProductStockList } from "./service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("Inventory stock list under the canonical MaterialVariant model", async (t) => {
  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: "Inventory Test Category" },
  });

  const material = await prisma.material.create({
    data: {
      name: "Cup Plastic Test",
      categoryId: category.id,
    },
  });

  const variant = await prisma.materialVariant.create({
    data: {
      materialId: material.id,
      name: "Cup Plastic Test",
      baseUnit: "PCS",
      sku: `INV-${Date.now()}`,
      isActive: true,
    },
  });

  const concessionWh = await prisma.warehouse.findFirst({ where: { code: "CONCESSION_TEST", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "CONCESSION_TEST", name: "Concession Store Test", warehouseType: "SALES", isActive: true },
    });

  const mainWh = await prisma.warehouse.findFirst({ where: { code: "MAIN_TEST", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "MAIN_TEST", name: "Main Warehouse Test", warehouseType: "SALES", isActive: true },
    });

  await prisma.inventoryStock.createMany({
    data: [
      { warehouseId: concessionWh.id, materialVariantId: variant.id, quantity: new Decimal(0) },
      { warehouseId: mainWh.id, materialVariantId: variant.id, quantity: new Decimal(1000) },
    ],
  });

  await t.test("Filters by a specific warehouse", async () => {
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

  await t.test("Filters by warehouse and returns exact stock value", async () => {
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

  await t.test("Returns all active warehouse snapshots when warehouseId is all", async () => {
    const activeWarehouses = await prisma.warehouse.findMany({ where: { isActive: true } });

    const result = await getProductStockList({
      warehouseId: "all",
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });

    const records = result.data.filter((item: any) => item.name === "Cup Plastic Test");
    assert.equal(records.length, activeWarehouses.length);

    const concessionRecord = records.find((item: any) => item.warehouseId === concessionWh.id);
    const mainRecord = records.find((item: any) => item.warehouseId === mainWh.id);

    assert.ok(concessionRecord);
    assert.equal(concessionRecord.quantity, 0);
    assert.ok(mainRecord);
    assert.equal(mainRecord.quantity, 1000);
  });

  await t.test("Creates an additional warehouse snapshot without breaking the all-warehouses result", async () => {
    const whB = await prisma.warehouse.create({
      data: { code: "WH_B_TEST", name: "Warehouse B Test", warehouseType: "SALES", isActive: true },
    });

    await prisma.inventoryStock.create({
      data: { warehouseId: whB.id, materialVariantId: variant.id, quantity: new Decimal(500) },
    });

    const result = await getProductStockList({
      warehouseId: "all",
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });

    const recordB = result.data.find((item: any) => item.warehouseId === whB.id && item.name === "Cup Plastic Test");
    assert.ok(recordB);
    assert.equal(recordB.quantity, 500);

    await prisma.inventoryStock.delete({ where: { warehouseId_materialVariantId: { warehouseId: whB.id, materialVariantId: variant.id } } });
    await prisma.warehouse.delete({ where: { id: whB.id } });
  });

  await t.test("Keeps zero-stock records visible across all warehouses when quantity is zero", async () => {
    const activeWarehouses = await prisma.warehouse.findMany({ where: { isActive: true } });

    await prisma.inventoryStock.update({
      where: { warehouseId_materialVariantId: { warehouseId: mainWh.id, materialVariantId: variant.id } },
      data: { quantity: new Decimal(0) },
    });

    const result = await getProductStockList({
      warehouseId: "all",
      search: "Cup Plastic Test",
      page: 1,
      limit: 100,
    });

    const records = result.data.filter((item: any) => item.name === "Cup Plastic Test");
    assert.equal(records.length, activeWarehouses.length);

    const mainRecord = records.find((item: any) => item.warehouseId === mainWh.id);
    assert.ok(mainRecord);
    assert.equal(mainRecord.quantity, 0);
  });

  await prisma.inventoryStock.deleteMany({ where: { materialVariantId: variant.id } });
  await prisma.materialVariant.delete({ where: { id: variant.id } });
  await prisma.material.delete({ where: { id: material.id } });
});
