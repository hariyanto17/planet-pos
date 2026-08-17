import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { createStockReceipt } from "./service";

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

test("receiving normalizes variant and packaging quantities into the configured material base unit", async () => {
  const suffix = Date.now().toString();
  const warehouse = await prisma.warehouse.create({ data: { code: `REC-${suffix}`, name: "Receiving Test Warehouse", warehouseType: "GENERAL" } });
  const product = await prisma.material.create({ data: { name: `Fresh Milk ${suffix}`, baseUnit: "ML" } });
  const otherProduct = await prisma.material.create({ data: { name: `Other Receiving Product ${suffix}`, baseUnit: "ML" } });
  const mineralWater = await prisma.material.create({ data: { name: `Mineral Water ${suffix}`, baseUnit: "ML" } });
  const variant = await prisma.materialVariant.create({ data: { materialId: product.id, name: "1L", quantityInBaseUnit: 1000 } });
  const otherVariant = await prisma.materialVariant.create({ data: { materialId: product.id, name: "1.5L", quantityInBaseUnit: 1500 } });
  const bottleVariant = await prisma.materialVariant.create({ data: { materialId: mineralWater.id, name: "600ml Bottle", quantityInBaseUnit: 600 } });
  const packaging = await prisma.packagingConfiguration.create({ data: { materialVariantId: variant.id, name: "Box", unitLabel: "12 pcs" } });
  const packagingVersion = await prisma.packagingVersion.create({ data: { packagingConfigurationId: packaging.id, conversionFactor: 12, normalizedToBaseQuantity: 12000 } });
  const otherPackaging = await prisma.packagingConfiguration.create({ data: { materialVariantId: otherVariant.id, name: "Other Box" } });
  await prisma.packagingVersion.create({ data: { packagingConfigurationId: otherPackaging.id, conversionFactor: 12, normalizedToBaseQuantity: 18000 } });
  const carton = await prisma.packagingConfiguration.create({ data: { materialVariantId: bottleVariant.id, name: "Carton", unitLabel: "24 bottles" } });
  await prisma.packagingVersion.create({ data: { packagingConfigurationId: carton.id, conversionFactor: 24, normalizedToBaseQuantity: 14400 } });
  const existingUser = await prisma.user.findFirst();
  const createdUser = existingUser ? null : await prisma.user.create({ data: { fullName: "Receiving Test User", username: `receipt-${suffix}`, passwordHash: "test", role: "ADMIN" } });
  const userId = (existingUser || createdUser)!.id;

  try {
    const individual = await createStockReceipt(userId, { productId: product.id, variantId: variant.id, warehouseId: warehouse.id, quantity: 10, note: "individual" });
    assert.equal(individual.normalizedQuantity, 10000);
    assert.equal(individual.newBalance, 10000);

    const boxed = await createStockReceipt(userId, { productId: product.id, variantId: variant.id, packagingId: packaging.id, warehouseId: warehouse.id, quantity: 10, note: "boxed" });
    assert.equal(boxed.normalizedQuantity, 120000);
    assert.equal(boxed.newBalance, 130000);

    const onePointFive = await createStockReceipt(userId, { productId: product.id, variantId: otherVariant.id, warehouseId: warehouse.id, quantity: 10 });
    assert.equal(onePointFive.normalizedQuantity, 15000);
    const onePointFiveBoxed = await createStockReceipt(userId, { productId: product.id, variantId: otherVariant.id, packagingId: otherPackaging.id, warehouseId: warehouse.id, quantity: 10 });
    assert.equal(onePointFiveBoxed.normalizedQuantity, 180000);

    const bottles = await createStockReceipt(userId, { productId: mineralWater.id, variantId: bottleVariant.id, warehouseId: warehouse.id, quantity: 20 });
    assert.equal(bottles.normalizedQuantity, 12000);
    const cartons = await createStockReceipt(userId, { productId: mineralWater.id, variantId: bottleVariant.id, packagingId: carton.id, warehouseId: warehouse.id, quantity: 2 });
    assert.equal(cartons.normalizedQuantity, 28800);

    const ledger = await prisma.stockLedger.findMany({ where: { warehouseId: warehouse.id, materialVariantId: variant.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(ledger.map((entry) => Number(entry.quantity)), [10000, 120000]);
    assert.equal(ledger[1].packagingVersionId, packagingVersion.id);
    assert.equal(Number(ledger[1].receivedQuantity), 10);
    assert.equal(ledger[1].receivedUnit, "12 pcs");

    await assert.rejects(() => createStockReceipt(userId, { productId: otherProduct.id, variantId: variant.id, warehouseId: warehouse.id, quantity: 1 }));
    await assert.rejects(() => createStockReceipt(userId, { productId: product.id, variantId: variant.id, packagingId: otherPackaging.id, warehouseId: warehouse.id, quantity: 1 }));
    const stock = await prisma.inventoryStock.findUnique({ where: { warehouseId_materialVariantId: { warehouseId: warehouse.id, materialVariantId: variant.id } } });
    assert.equal(Number(stock?.quantity), 130000);
  } finally {
    await prisma.stockLedger.deleteMany({ where: { warehouseId: warehouse.id } });
    await prisma.inventoryStock.deleteMany({ where: { warehouseId: warehouse.id } });
    await prisma.packagingVersion.deleteMany({ where: { packagingConfigurationId: { in: [packaging.id, otherPackaging.id, carton.id] } } });
    await prisma.packagingConfiguration.deleteMany({ where: { id: { in: [packaging.id, otherPackaging.id, carton.id] } } });
    await prisma.materialVariant.deleteMany({ where: { id: { in: [variant.id, otherVariant.id, bottleVariant.id] } } });
    await prisma.material.delete({ where: { id: product.id } });
    await prisma.material.delete({ where: { id: otherProduct.id } });
    await prisma.material.delete({ where: { id: mineralWater.id } });
    await prisma.warehouse.delete({ where: { id: warehouse.id } });
    if (createdUser) await prisma.user.delete({ where: { id: createdUser.id } });
  }
});
