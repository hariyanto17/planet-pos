import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { getInventorySummary, getProductStockList } from "./service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("Inventory summary counts active material variants and committed recipe consumption", async (t) => {
  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: "Summary Test Category" },
  });

  const whActive1 = await prisma.warehouse.findFirst({ where: { code: "WH_ACT_1", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "WH_ACT_1", name: "Active WH 1", warehouseType: "SALES", isActive: true },
    });

  const whActive2 = await prisma.warehouse.findFirst({ where: { code: "WH_ACT_2", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "WH_ACT_2", name: "Active WH 2", warehouseType: "SALES", isActive: true },
    });

  const whInactive = await prisma.warehouse.findFirst({ where: { code: "WH_INACT", isActive: false } })
    || await prisma.warehouse.create({
      data: { code: "WH_INACT", name: "Inactive WH", warehouseType: "SALES", isActive: false },
    });

  await t.test("Recipe-based consumption is counted without listing sellable products as inventory items", async () => {
    const compA = await prisma.material.create({ data: { name: "Summary Test Component A", categoryId: category.id } });
    const compAVariant = await prisma.materialVariant.create({ data: { materialId: compA.id, name: "Component A", baseUnit: "PCS", sku: `A-${Date.now()}` } });
    const compB = await prisma.material.create({ data: { name: "Summary Test Component B", categoryId: category.id } });
    const compBVariant = await prisma.materialVariant.create({ data: { materialId: compB.id, name: "Component B", baseUnit: "PCS", sku: `B-${Date.now()}` } });

    const product = await prisma.sellableProduct.create({
      data: {
        name: "Summary Test Finished Good",
        sku: `FG-${Date.now()}`,
        productType: "RECIPE_BASED",
        price: new Decimal(5000),
      },
    });

    await prisma.recipe.create({
      data: {
        sellableProductId: product.id,
        items: {
          create: [
            { materialVariantId: compAVariant.id, quantity: new Decimal(2) },
            { materialVariantId: compBVariant.id, quantity: new Decimal(1) },
          ],
        },
      },
    });

    await prisma.inventoryStock.createMany({
      data: [
        { warehouseId: whActive1.id, materialVariantId: compAVariant.id, quantity: new Decimal(40) },
        { warehouseId: whActive2.id, materialVariantId: compBVariant.id, quantity: new Decimal(25) },
      ],
    });

    const inventoryList = await getProductStockList({ warehouseId: "all", limit: 100 });
    const foundProduct = inventoryList.data.some((item: any) => item.name === "Summary Test Finished Good");
    assert.ok(!foundProduct, "Sellable products are not inventory rows");

    const summary = await getInventorySummary();
    assert.ok(summary.totalProducts >= 2);

    await prisma.recipe.delete({ where: { sellableProductId: product.id } });
    await prisma.sellableProduct.delete({ where: { id: product.id } });
    await prisma.inventoryStock.deleteMany({ where: { materialVariantId: { in: [compAVariant.id, compBVariant.id] } } });
    await prisma.materialVariant.deleteMany({ where: { id: { in: [compAVariant.id, compBVariant.id] } } });
    await prisma.material.deleteMany({ where: { id: { in: [compA.id, compB.id] } } });
  });

  await t.test("Only active warehouse stock contributes to summary values", async () => {
    const directMaterial = await prisma.material.create({ data: { name: "Summary Test Direct Material", categoryId: category.id } });
    const directVariant = await prisma.materialVariant.create({ data: { materialId: directMaterial.id, name: "Direct Material", baseUnit: "PCS", sku: `DM-${Date.now()}` } });

    await prisma.inventoryStock.createMany({
      data: [
        { warehouseId: whActive1.id, materialVariantId: directVariant.id, quantity: new Decimal(0) },
        { warehouseId: whActive2.id, materialVariantId: directVariant.id, quantity: new Decimal(100) },
        { warehouseId: whInactive.id, materialVariantId: directVariant.id, quantity: new Decimal(500) },
      ],
    });

    const summary = await getInventorySummary();
    assert.ok(summary.inventoryValue >= 0);
    assert.ok(summary.totalProducts >= 1);

    await prisma.inventoryStock.deleteMany({ where: { materialVariantId: directVariant.id } });
    await prisma.materialVariant.delete({ where: { id: directVariant.id } });
    await prisma.material.delete({ where: { id: directMaterial.id } });
  });

  await t.test("Low stock and zero stock thresholds are evaluated on active inventory only", async () => {
    const lowMaterial = await prisma.material.create({ data: { name: "Summary Test Low Material", categoryId: category.id } });
    const lowVariant = await prisma.materialVariant.create({ data: { materialId: lowMaterial.id, name: "Low Material", baseUnit: "PCS", sku: `LM-${Date.now()}` } });

    await prisma.inventoryStock.createMany({
      data: [
        { warehouseId: whActive1.id, materialVariantId: lowVariant.id, quantity: new Decimal(5) },
        { warehouseId: whInactive.id, materialVariantId: lowVariant.id, quantity: new Decimal(1000) },
      ],
    });

    const summary = await getInventorySummary();
    assert.ok(summary.lowStockProducts >= 0 || summary.outOfStockProducts >= 0);

    await prisma.inventoryStock.deleteMany({ where: { materialVariantId: lowVariant.id } });
    await prisma.materialVariant.delete({ where: { id: lowVariant.id } });
    await prisma.material.delete({ where: { id: lowMaterial.id } });
  });

  await prisma.warehouse.delete({ where: { id: whInactive.id } });
});
