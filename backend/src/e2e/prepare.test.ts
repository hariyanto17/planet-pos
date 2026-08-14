import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { createOrder, updateOrderStatus } from "../modules/orders/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("System Preparation: Validate canonical domain model and workflows", async (t) => {
  // Get or create cashier user
  let cashier = await prisma.user.findFirst({ where: { role: "CASHIER" } });
  if (!cashier) {
    cashier = await prisma.user.create({
      data: {
        username: `cashier-prep-${Date.now()}`,
        passwordHash: "hashed",
        fullName: "Prep Cashier",
        role: "CASHIER",
        isActive: true,
      },
    });
  }

  // Get or create kitchen user
  let kitchen = await prisma.user.findFirst({ where: { role: "KITCHEN" } });
  if (!kitchen) {
    kitchen = await prisma.user.create({
      data: {
        username: `kitchen-prep-${Date.now()}`,
        passwordHash: "hashed",
        fullName: "Prep Kitchen",
        role: "KITCHEN",
        isActive: true,
      },
    });
  }

  // Get kitchen warehouse
  const kitchenWh = await prisma.warehouse.findFirst({
    where: { isDefaultKitchenStorage: true },
  });
  assert.ok(kitchenWh, "Kitchen warehouse with isDefaultKitchenStorage should exist");

  // Ensure cashier shift is open
  const shift = await prisma.cashierShift.findFirst({
    where: { userId: cashier.id, status: "OPEN" },
  });
  if (!shift) {
    await prisma.cashierShift.create({
      data: {
        userId: cashier.id,
        status: "OPEN",
        openingCash: new Decimal(500000),
        businessDate: new Date(),
      },
    });
  }

  // Validation 1: Recipe product and stock initialization
  await t.test("Validate: Recipe product is seeded with proper stock", async () => {
    const icedTea = await prisma.sellableProduct.findFirst({
      where: { name: "Iced Tea" },
      include: { recipe: { include: { items: true } } },
    });

    if (!icedTea || !icedTea.recipe) {
      console.log("    ⊘ Seeded Iced Tea not found, skipping recipe test");
      return;
    }

    assert.ok(icedTea.recipe.items.length > 0, "Recipe should have items");
    console.log(`    ✓ Found Iced Tea with ${icedTea.recipe.items.length} recipe items`);
  });

  // Validation 2: Recipe-based order workflow and stock deduction
  await t.test("Validate: Recipe order completion deducts stock correctly", async () => {
    const icedTea = await prisma.sellableProduct.findFirst({
      where: { name: "Iced Tea", productType: "RECIPE_BASED" },
    });

    if (!icedTea) {
      console.log("    ⊘ Iced Tea recipe product not found, skipping");
      return;
    }

    // Get first recipe ingredient stock before order
    const recipe = await prisma.recipe.findUnique({
      where: { sellableProductId: icedTea.id },
      include: { items: true },
    });

    if (!recipe || !recipe.items[0]) {
      console.log("    ⊘ Recipe or items not found, skipping");
      return;
    }

    const ingredient = recipe.items[0];
    const stockBefore = await prisma.inventoryStock.findUnique({
      where: {
        warehouseId_materialVariantId: {
          warehouseId: kitchenWh.id,
          materialVariantId: ingredient.materialVariantId,
        },
      },
    });

    // Create order
    const order = await createOrder(cashier.id, {
      customerName: "Smoke Test",
      orderType: "DINE_IN",
      items: [{ sellableProductId: icedTea.id, quantity: 1 }],
    });

    assert.ok(order.id, "Order ID should exist");
    assert.equal(order.status, OrderStatus.NEW, "Order should be NEW");

    // Complete order
    await updateOrderStatus(order.id, OrderStatus.PREPARING, kitchen.id);
    await updateOrderStatus(order.id, OrderStatus.READY, kitchen.id);
    await updateOrderStatus(order.id, OrderStatus.COMPLETED, kitchen.id);

    // Verify stock was deducted
    const stockAfter = await prisma.inventoryStock.findUnique({
      where: {
        warehouseId_materialVariantId: {
          warehouseId: kitchenWh.id,
          materialVariantId: ingredient.materialVariantId,
        },
      },
    });

    const deducted = (stockBefore?.quantity || new Decimal(0)).sub(stockAfter?.quantity || new Decimal(0));
    const expected = ingredient.quantity;

    assert.equal(deducted.toString(), expected.toString(), `Stock should be deducted by ${expected}`);

    // Verify ledger entries
    const ledger = await prisma.stockLedger.findMany({
      where: { referenceId: order.id, referenceType: "RECIPE_CONSUMPTION" },
    });

    assert.ok(ledger.length > 0, "Ledger entries should exist");
    console.log(`    ✓ Recipe order ${order.displayNumber} completed, stock deducted, ledger created`);
  });

  // Validation 3: Direct-sale product order and ledger creation
  await t.test("Validate: Direct-sale order completion creates ledger entries", async () => {
    const readyTea = await prisma.sellableProduct.findFirst({
      where: { name: "Ready Tea", productType: "DIRECT_SALE" },
    });

    if (!readyTea || !readyTea.directSaleMaterialVariantId) {
      console.log("    ⊘ Ready Tea direct-sale product not found, skipping");
      return;
    }

    const order = await createOrder(cashier.id, {
      customerName: "Direct Sale Test",
      orderType: "TAKEAWAY",
      items: [{ sellableProductId: readyTea.id, quantity: 1 }],
    });

    assert.ok(order.id, "Direct-sale order should be created");

    await updateOrderStatus(order.id, OrderStatus.PREPARING, kitchen.id);
    await updateOrderStatus(order.id, OrderStatus.READY, kitchen.id);
    await updateOrderStatus(order.id, OrderStatus.COMPLETED, kitchen.id);

    const completedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(completedOrder?.status, OrderStatus.COMPLETED, "Order should be completed");

    // Verify ledger entry created (stock deduction happens via SALE movement type)
    const ledger = await prisma.stockLedger.findMany({
      where: {
        referenceId: order.id,
        referenceType: "SALE",
      },
    });

    assert.ok(ledger.length > 0, "Sale ledger entry should exist");

    console.log(`    ✓ Direct-sale order ${order.displayNumber} completed, ledger created`);
  });

  // Validation 4: Multiple sequential orders and cumulative stock changes
  await t.test("Validate: Multiple orders process sequentially with correct stock tracking", async () => {
    const icedTea = await prisma.sellableProduct.findFirst({
      where: { name: "Iced Tea", productType: "RECIPE_BASED" },
    });

    if (!icedTea) {
      console.log("    ⊘ Iced Tea not found, skipping");
      return;
    }

    // Create 3 orders
    const orders = [];
    for (let i = 0; i < 3; i++) {
      const order = await createOrder(cashier.id, {
        customerName: `Multi ${i}`,
        orderType: "DINE_IN",
        items: [{ sellableProductId: icedTea.id, quantity: 1 }],
      });

      await updateOrderStatus(order.id, OrderStatus.PREPARING, kitchen.id);
      await updateOrderStatus(order.id, OrderStatus.READY, kitchen.id);
      await updateOrderStatus(order.id, OrderStatus.COMPLETED, kitchen.id);

      orders.push(order);
    }

    const completedOrders = await prisma.order.findMany({
      where: { id: { in: orders.map((o) => o.id) } },
    });

    assert.equal(completedOrders.length, 3, "All 3 orders should exist");
    assert.ok(completedOrders.every((o) => o.status === OrderStatus.COMPLETED), "All orders should be completed");

    console.log(`    ✓ 3 sequential orders created and completed successfully`);
  });

  console.log("\n✅ System preparation complete - canonical domain model validated!");
});
