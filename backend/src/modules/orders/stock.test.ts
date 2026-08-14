import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { createOrder, updateOrderStatus } from "./service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("Order stock validation under the canonical sellable-product model", async (t) => {
  const cashierUser = await prisma.user.findFirst({ where: { role: "CASHIER" } }) || await prisma.user.create({
    data: {
      username: `cashier-mv-${Date.now()}`,
      passwordHash: "hashed",
      fullName: "Cashier MV",
      role: "CASHIER",
      isActive: true,
    },
  });

  const kitchenUser = await prisma.user.findFirst({ where: { role: "KITCHEN" } }) || await prisma.user.create({
    data: {
      username: `kitchen-mv-${Date.now()}`,
      passwordHash: "hashed",
      fullName: "Kitchen MV",
      role: "KITCHEN",
      isActive: true,
    },
  });

  const warehouse = await prisma.warehouse.findFirst({
    where: { warehouseType: "KITCHEN_STORAGE", isDefaultKitchenStorage: true, isActive: true },
  }) || await prisma.warehouse.create({
    data: {
      code: `WH_KITCHEN_MV_${Date.now()}`,
      name: "Kitchen MV",
      warehouseType: "KITCHEN_STORAGE",
      isActive: true,
      isDefaultKitchenStorage: true,
    },
  });

  await prisma.cashierShift.upsert({
    where: { id: (await prisma.cashierShift.findFirst({ where: { userId: cashierUser.id, status: "OPEN" } }))?.id ?? "__missing__" },
    update: {},
    create: {
      userId: cashierUser.id,
      status: "OPEN",
      openingCash: new Decimal(100000),
      businessDate: new Date(),
    },
  });

  await t.test("Direct-sale sellable products deduct stock from the linked material variant", async () => {
    const material = await prisma.material.create({ data: { name: `Direct Material ${Date.now()}` } });
    const variant = await prisma.materialVariant.create({
      data: {
        materialId: material.id,
        name: "Direct Variant",
        baseUnit: "PCS",
        sku: `DV-${Date.now()}`,
      },
    });

    const product = await prisma.sellableProduct.create({
      data: {
        name: "Direct Milk",
        sku: `DP-${Date.now()}`,
        productType: "DIRECT_SALE",
        price: new Decimal(5000),
        directSaleMaterialVariantId: variant.id,
      },
    });

    await prisma.inventoryStock.create({
      data: {
        warehouseId: warehouse.id,
        materialVariantId: variant.id,
        quantity: new Decimal(10),
      },
    });

    const order = await createOrder(cashierUser.id, {
      customerName: "Direct Sale Test",
      orderType: "TAKEAWAY",
      items: [{ sellableProductId: product.id, quantity: 3 }],
    });

    await updateOrderStatus(order.id, OrderStatus.PREPARING, kitchenUser.id);
    await updateOrderStatus(order.id, OrderStatus.READY, kitchenUser.id);
    await updateOrderStatus(order.id, OrderStatus.COMPLETED, kitchenUser.id);

    const stockAfter = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: warehouse.id, materialVariantId: variant.id } },
    });
    assert.ok(stockAfter);
    assert.equal(Number(stockAfter.quantity), 7);

    await prisma.inventoryStock.delete({ where: { warehouseId_materialVariantId: { warehouseId: warehouse.id, materialVariantId: variant.id } } });
    await prisma.stockLedger.deleteMany({ where: { materialVariantId: variant.id } });
    await prisma.orderItem.deleteMany({ where: { sellableProductId: product.id } });
    await prisma.sellableProduct.delete({ where: { id: product.id } });
    await prisma.materialVariant.delete({ where: { id: variant.id } });
    await prisma.material.delete({ where: { id: material.id } });
  });

  await t.test("Recipe-based sellable products consume ingredient stock on completion", async () => {
    const material = await prisma.material.create({ data: { name: `Recipe Material ${Date.now()}` } });
    const variant = await prisma.materialVariant.create({
      data: {
        materialId: material.id,
        name: "Recipe Ingredient",
        baseUnit: "PCS",
        sku: `RV-${Date.now()}`,
      },
    });

    const product = await prisma.sellableProduct.create({
      data: {
        name: "Recipe Tea",
        sku: `RT-${Date.now()}`,
        productType: "RECIPE_BASED",
        price: new Decimal(12000),
      },
    });

    await prisma.recipe.create({
      data: {
        sellableProductId: product.id,
        items: {
          create: [{ materialVariantId: variant.id, quantity: new Decimal(2) }],
        },
      },
    });

    await prisma.inventoryStock.create({
      data: {
        warehouseId: warehouse.id,
        materialVariantId: variant.id,
        quantity: new Decimal(20),
      },
    });

    const order = await createOrder(cashierUser.id, {
      customerName: "Recipe Order Test",
      orderType: "TAKEAWAY",
      items: [{ sellableProductId: product.id, quantity: 1 }],
    });

    await updateOrderStatus(order.id, OrderStatus.PREPARING, kitchenUser.id);
    await updateOrderStatus(order.id, OrderStatus.READY, kitchenUser.id);
    await updateOrderStatus(order.id, OrderStatus.COMPLETED, kitchenUser.id);

    const stockAfter = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: warehouse.id, materialVariantId: variant.id } },
    });
    assert.ok(stockAfter);
    assert.equal(Number(stockAfter.quantity), 18);

    await prisma.inventoryStock.delete({ where: { warehouseId_materialVariantId: { warehouseId: warehouse.id, materialVariantId: variant.id } } });
    await prisma.stockLedger.deleteMany({ where: { materialVariantId: variant.id } });
    await prisma.orderItem.deleteMany({ where: { sellableProductId: product.id } });
    await prisma.recipeItem.deleteMany({ where: { materialVariantId: variant.id } });
    await prisma.recipe.delete({ where: { sellableProductId: product.id } });
    await prisma.sellableProduct.delete({ where: { id: product.id } });
    await prisma.materialVariant.delete({ where: { id: variant.id } });
    await prisma.material.delete({ where: { id: material.id } });
  });
});
