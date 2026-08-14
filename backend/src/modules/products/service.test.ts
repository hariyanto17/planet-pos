import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { getAllProducts } from "./service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("Sellable products report available stock based on material-variant inventory", async () => {
  const material = await prisma.material.create({ data: { name: `Product Stock Material ${Date.now()}` } });
  const variantA = await prisma.materialVariant.create({
    data: { materialId: material.id, name: "Ingredient A", baseUnit: "PCS", sku: `PSA-${Date.now()}` },
  });
  const variantB = await prisma.materialVariant.create({
    data: { materialId: material.id, name: "Ingredient B", baseUnit: "PCS", sku: `PSB-${Date.now()}` },
  });

  const sellable = await prisma.sellableProduct.create({
    data: {
      name: "Combo Drink",
      sku: `SP-${Date.now()}`,
      price: new Decimal(15000),
    },
  });

  await prisma.recipe.create({
    data: {
      sellableProductId: sellable.id,
      items: {
        create: [
          { materialVariantId: variantA.id, quantity: new Decimal(2) },
          { materialVariantId: variantB.id, quantity: new Decimal(1) },
        ],
      },
    },
  });

  const warehouseA = await prisma.warehouse.findFirst({ where: { code: "WH_MAIN_TEST" } }) || await prisma.warehouse.create({
    data: { code: "WH_MAIN_TEST", name: "Main Warehouse Test", warehouseType: "SALES", isActive: true },
  });

  const warehouseB = await prisma.warehouse.findFirst({ where: { code: "WH_KITCHEN_TEST" } }) || await prisma.warehouse.create({
    data: { code: "WH_KITCHEN_TEST", name: "Kitchen Storage Test", warehouseType: "KITCHEN_STORAGE", isActive: true },
  });

  await prisma.inventoryStock.createMany({
    data: [
      { warehouseId: warehouseA.id, materialVariantId: variantA.id, quantity: new Decimal(30) },
      { warehouseId: warehouseA.id, materialVariantId: variantB.id, quantity: new Decimal(12) },
      { warehouseId: warehouseB.id, materialVariantId: variantA.id, quantity: new Decimal(10) },
    ],
  });

  const products = await getAllProducts(true);
  const product = products.find((p) => p.id === sellable.id);

  assert.ok(product);
  assert.equal(product.availableStock, 12);

  await prisma.inventoryStock.deleteMany({ where: { materialVariantId: { in: [variantA.id, variantB.id] } } });
  await prisma.stockLedger.deleteMany({ where: { materialVariantId: { in: [variantA.id, variantB.id] } } });
  await prisma.recipeItem.deleteMany({ where: { materialVariantId: { in: [variantA.id, variantB.id] } } });
  await prisma.recipe.delete({ where: { sellableProductId: sellable.id } });
  await prisma.sellableProduct.delete({ where: { id: sellable.id } });
  await prisma.materialVariant.deleteMany({ where: { id: { in: [variantA.id, variantB.id] } } });
  await prisma.material.delete({ where: { id: material.id } });
});
