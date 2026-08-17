import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, BaseUnit } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import {
  normalizeBrandInput,
  normalizeMaterialInput,
  normalizeMaterialVariantInput,
  normalizeSellableProductInput,
  normalizeInventoryStockInput,
} from "./service";
import { createProduct } from "../products/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("normalizeBrandInput keeps the legacy product flow untouched while creating brand data", () => {
  const normalized = normalizeBrandInput({ name: " Brand A " });

  assert.deepEqual(normalized, {
    name: "Brand A",
    isActive: true,
  });
});

test("normalizeMaterialInput links material data to the provided brand", () => {
  const normalized = normalizeMaterialInput({
    brandId: "brand-1",
    name: "UHT Milk",
    description: "Whole milk",
  });

  assert.deepEqual(normalized, {
    brandId: "brand-1",
    categoryId: null,
    name: "UHT Milk",
    baseUnit: "PCS",
    description: "Whole milk",
    isActive: true,
  });
});

test("normalizeMaterialVariantInput preserves quantity value", () => {
  const normalized = normalizeMaterialVariantInput({
    materialId: "material-1",
    name: "600 ML",
    quantityInBaseUnit: 600,
    sku: "MILK-600",
  });

  assert.deepEqual(normalized, {
    materialId: "material-1",
    name: "600 ML",
    variantCode: null,
    quantityInBaseUnit: "600",
    sku: "MILK-600",
    barcode: null,
    isActive: true,
  });
});

test("normalizeSellableProductInput keeps direct-sale sellable product data valid", () => {
  const normalized = normalizeSellableProductInput({
    name: "Fresh Milk 600 ML",
    sku: " SELL-1 ",
    productType: "DIRECT_SALE",
    price: 18000,
  });

  assert.deepEqual(normalized, {
    name: "Fresh Milk 600 ML",
    sku: "SELL-1",
    categoryId: null,
    brandId: null,
    productType: "DIRECT_SALE",
    price: "18000",
    isActive: true,
  });
});

test("normalizeInventoryStockInput stores material-variant stock by warehouse and variant", () => {
  const normalized = normalizeInventoryStockInput({
    warehouseId: "warehouse-1",
    materialVariantId: "material-variant-1",
    quantity: 12,
  });

  assert.deepEqual(normalized, {
    warehouseId: "warehouse-1",
    materialVariantId: "material-variant-1",
    quantity: "12",
  });
});

test("Database integration: Brand creation and uniqueness", async () => {
  const brandName = `Test Brand ${Date.now()}`;

  const b = await prisma.brand.create({ data: { name: brandName } });
  assert.ok(b.id);
  assert.equal(b.name, brandName);

  await assert.rejects(async () => {
    await prisma.brand.create({ data: { name: brandName } });
  });

  await prisma.brand.delete({ where: { id: b.id } });
});

test("Database integration: Material creation transactions and inventory bounds", async () => {
  const category = await prisma.category.create({ data: { name: `Test Cat ${Date.now()}` } });
  const brand = await prisma.brand.create({ data: { name: `Test Brand ${Date.now()}` } });
  const materialName = `Test Material ${Date.now()}`;

  const m1 = await prisma.material.create({
    data: {
      name: materialName,
      categoryId: category.id,
      brandId: brand.id,
      baseUnit: "G",
    }
  });
  assert.ok(m1.id);

  const stocks1 = await prisma.inventoryStock.findMany({ where: { materialVariantId: m1.id } });
  assert.equal(stocks1.length, 0);

  const sku = `SKU-${Date.now()}`;
  const barcode = `BARCODE-${Date.now()}`;

  const m2 = await prisma.material.create({
    data: {
      name: "Milk with Variant",
      categoryId: category.id,
      brandId: brand.id,
      baseUnit: "ML",
    }
  });

  const v2 = await prisma.materialVariant.create({
    data: {
      materialId: m2.id,
      name: "600 ML",
      sku,
      barcode,
      quantityInBaseUnit: 600,
      cost: "10000",
    }
  });

  assert.ok(v2.id);

  await assert.rejects(async () => {
    await prisma.$transaction(async (tx) => {
      const m3 = await tx.material.create({
        data: { name: "Failed Material", categoryId: category.id, baseUnit: "ML" }
      });
      await tx.materialVariant.create({
        data: {
          materialId: m3.id,
          name: "600 ML Duplicate",
          sku,
          quantityInBaseUnit: 600,
        }
      });
    });
  });

  const failed = await prisma.material.findFirst({ where: { name: "Failed Material" } });
  assert.equal(failed, null);

  await prisma.materialVariant.delete({ where: { id: v2.id } });
  await prisma.material.delete({ where: { id: m2.id } });
  await prisma.material.delete({ where: { id: m1.id } });
  await prisma.brand.delete({ where: { id: brand.id } });
  await prisma.category.delete({ where: { id: category.id } });
});

test("Database integration: Finished Product creation and recipe integration", async () => {
  const category = await prisma.category.create({ data: { name: `Test Cat FP ${Date.now()}` } });
  const material = await prisma.material.create({ data: { name: "Ing", categoryId: category.id, baseUnit: "G" } });
  const variant = await prisma.materialVariant.create({
    data: { materialId: material.id, name: "Ing Var", quantityInBaseUnit: 1.0 }
  });

  const p1 = await createProduct({
    name: "Fried Rice",
    categoryId: category.id,
    price: 20000,
    productType: "DIRECT_SALE",
    directSaleMaterialVariantId: variant.id,
  });
  assert.ok(p1);
  assert.ok(p1.id);
  assert.equal(p1.price, 20000);

  const p2 = await createProduct({
    name: "Chicken Soup",
    categoryId: category.id,
    price: 30000,
    productType: "RECIPE_BASED",
    recipe: {
      items: [
        { materialId: material.id, quantity: 150, note: "Chicken breast" }
      ]
    }
  });

  assert.ok(p2);
  assert.ok(p2.id);

  const recipe = await prisma.recipe.findUnique({
    where: { sellableProductId: p2.id },
    include: { items: true }
  });
  assert.ok(recipe);
  assert.equal(recipe.items.length, 1);
  assert.equal(recipe.items[0].materialId, material.id);
  assert.equal(Number(recipe.items[0].quantity), 150);

  if (recipe) {
    await prisma.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
    await prisma.recipe.delete({ where: { id: recipe.id } });
  }
  await prisma.sellableProduct.delete({ where: { id: p2.id } });
  await prisma.sellableProduct.delete({ where: { id: p1.id } });
  await prisma.materialVariant.delete({ where: { id: variant.id } });
  await prisma.material.delete({ where: { id: material.id } });
  await prisma.category.delete({ where: { id: category.id } });
});

test("Database integration: MaterialVariant creation, cost calculations and boundaries", async () => {
  const category = await prisma.category.create({ data: { name: `Cat MV ${Date.now()}` } });
  const material = await prisma.material.create({ data: { name: "Creamer MV", categoryId: category.id, baseUnit: "G" } });
  const supplier = await prisma.supplier.create({ data: { name: "Supplier MV", code: `SUP-${Date.now()}` } });

  const sku = `SKU-MV-${Date.now()}`;
  const barcode = `BAR-MV-${Date.now()}`;
  const purchasePrice = 50000;
  const variantQuantity = 500;
  const expectedCost = purchasePrice / variantQuantity;

  const variant = await prisma.$transaction(async (tx) => {
    const v = await tx.materialVariant.create({
      data: {
        materialId: material.id,
        name: "500g",
        sku,
        barcode,
        quantityInBaseUnit: 500,
        cost: expectedCost,
      }
    });

    await tx.supplierOffer.create({
      data: {
        supplierId: supplier.id,
        materialVariantId: v.id,
        unitPrice: purchasePrice,
        currency: "IDR",
        isActive: true,
      }
    });
    return v;
  });

  assert.ok(variant.id);
  assert.equal(Number(variant.cost), 100);

  const offer = await prisma.supplierOffer.findFirst({
    where: { materialVariantId: variant.id }
  });
  assert.ok(offer);
  assert.equal(Number(offer.unitPrice), 50000);

  const stockCount = await prisma.inventoryStock.count({
    where: { materialVariantId: variant.id }
  });
  assert.equal(stockCount, 0);

  const ledgerCount = await prisma.stockLedger.count({
    where: { materialVariantId: variant.id }
  });
  assert.equal(ledgerCount, 0);

  await assert.rejects(async () => {
    await prisma.materialVariant.create({
      data: {
        materialId: material.id,
        name: "500g Duplicate SKU",
        sku,
        quantityInBaseUnit: 500,
      }
    });
  });

  await prisma.supplierOffer.deleteMany({ where: { materialVariantId: variant.id } });
  await prisma.materialVariant.delete({ where: { id: variant.id } });
  await prisma.supplier.delete({ where: { id: supplier.id } });
  await prisma.material.delete({ where: { id: material.id } });
  await prisma.category.delete({ where: { id: category.id } });

  await prisma.$disconnect();
  await pool.end();
});
