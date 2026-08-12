import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, OrderStatus, PaymentMethod, PaymentStatus, InventoryType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createOrder } from "./service";
import { getAllProducts } from "../products/service";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

test("POS Cashier Sellable Stock Calculations and Checkout Validation Tests", async (t) => {
  // Setup test environment
  const cashierUser = await prisma.user.findFirst({ where: { role: "CASHIER" } });
  if (!cashierUser) {
    throw new Error("Cashier user not found. Please run db seeds.");
  }

  const shift = await prisma.cashierShift.findFirst({
    where: { userId: cashierUser.id, status: "OPEN" },
  }) || await prisma.cashierShift.create({
    data: {
      userId: cashierUser.id,
      status: "OPEN",
      openingCash: new Decimal(100000),
      businessDate: new Date(),
    },
  });

  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: "Test Cat" },
  });

  const unit = await prisma.unit.findFirst() || await prisma.unit.create({
    data: { name: "Pieces", symbol: "PCS" },
  });

  // Setup multiple active warehouses for stock distribution tests
  const wh1 = await prisma.warehouse.findFirst({ where: { warehouseType: "KITCHEN_STORAGE", isActive: true } }) 
    || await prisma.warehouse.create({
      data: { code: "WH_KITCHEN", name: "Kitchen Storage", warehouseType: "KITCHEN_STORAGE", isActive: true, isDefaultKitchenStorage: true },
    });

  const wh2 = await prisma.warehouse.findFirst({ where: { warehouseType: "SALES", code: "CONCESSION", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "CONCESSION", name: "Concession Warehouse", warehouseType: "SALES", isActive: true },
    });

  // 1. Finished good with one recipe component
  await t.test("Scenario 1 & 2 — Finished good with one or multiple recipe components", async () => {
    // Create component raw materials
    const sugar = await prisma.product.create({
      data: { name: "Sugar Component", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, price: 0, unitId: unit.id },
    });
    const tea = await prisma.product.create({
      data: { name: "Tea Component", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, price: 0, unitId: unit.id },
    });

    // Create finished good
    const sweetTea = await prisma.product.create({
      data: { name: "Sweet Tea Product", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(5000), unitId: unit.id },
    });

    // Create recipe: Sweet Tea = 10 Sugar + 1 Tea
    const recipe = await prisma.recipe.create({
      data: {
        productId: sweetTea.id,
        items: {
          create: [
            { componentProductId: sugar.id, quantity: new Decimal(10), unitId: unit.id },
            { componentProductId: tea.id, quantity: new Decimal(1), unitId: unit.id },
          ],
        },
      },
    });

    // Set stock: Sugar = 300, Tea = 25
    await prisma.warehouseStock.createMany({
      data: [
        { warehouseId: wh1.id, productId: sugar.id, quantity: new Decimal(300) },
        { warehouseId: wh1.id, productId: tea.id, quantity: new Decimal(25) },
      ],
    });

    // Producible max Sweet Tea: Sugar: 300/10 = 30, Tea: 25/1 = 25. Min is 25.
    const products = await getAllProducts(true);
    const teaProd = products.find((p: any) => p.id === sweetTea.id);
    assert.ok(teaProd);
    assert.equal(teaProd.availableStock, 25);
  });

  // 3. Distributed components, Kitchen Storage has zero / negative stock, but total is sufficient
  await t.test("Scenario 3, 4 & 5 — Stock distributed, kitchen zero/negative allowed", async () => {
    const rawComponent = await prisma.product.create({
      data: { name: "Distributed Component", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, price: 0, unitId: unit.id },
    });
    const finishedProd = await prisma.product.create({
      data: { name: "Finished Product Dist", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(10000), unitId: unit.id },
    });

    await prisma.recipe.create({
      data: {
        productId: finishedProd.id,
        items: {
          create: [{ componentProductId: rawComponent.id, quantity: new Decimal(1), unitId: unit.id }],
        },
      },
    });

    // Kitchen WH has -5 stock, Main WH has 20 stock. Total available = 15.
    await prisma.warehouseStock.createMany({
      data: [
        { warehouseId: wh1.id, productId: rawComponent.id, quantity: new Decimal(-5) },
        { warehouseId: wh2.id, productId: rawComponent.id, quantity: new Decimal(20) },
      ],
    });

    const products = await getAllProducts(true);
    const prod = products.find((p: any) => p.id === finishedProd.id);
    assert.ok(prod);
    assert.equal(prod.availableStock, 15);

    // Order 11 units (exceeds Kitchen WH stock but matches total inventory). Should succeed!
    const orderInput = {
      customerName: "Negative Test",
      orderType: "TAKEAWAY" as any,
      items: [{ productId: finishedProd.id, quantity: 11 }],
    };

    const order = await createOrder(cashierUser.id, orderInput);
    assert.ok(order);
    assert.equal(order.status, OrderStatus.NEW);
  });

  // 6. Exceeds total inventory limit
  await t.test("Scenario 6 — Reject order exceeding total stock", async () => {
    const finishedProd = await prisma.product.findFirst({
      where: { name: "Finished Product Dist" },
    });
    assert.ok(finishedProd);

    // Order 20 units (total available stock is now smaller since 11 were already ordered, so this will exceed total available stock)
    const orderInput = {
      customerName: "Limit Test",
      orderType: "TAKEAWAY" as any,
      items: [{ productId: finishedProd.id, quantity: 10 }],
    };

    await assert.rejects(
      async () => {
        await createOrder(cashierUser.id, orderInput);
      },
      /Insufficient inventory/
    );
  });

  // 7. Multiple cart items sharing the same component
  await t.test("Scenario 7 — Multiple items sharing components are aggregated", async () => {
    const commonComponent = await prisma.product.create({
      data: { name: "Common Sugar Component", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, price: 0, unitId: unit.id },
    });
    const prodA = await prisma.product.create({
      data: { name: "Product A", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(10000), unitId: unit.id },
    });
    const prodB = await prisma.product.create({
      data: { name: "Product B", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(10000), unitId: unit.id },
    });

    await prisma.recipe.create({
      data: {
        productId: prodA.id,
        items: {
          create: [{ componentProductId: commonComponent.id, quantity: new Decimal(10), unitId: unit.id }],
        },
      },
    });
    await prisma.recipe.create({
      data: {
        productId: prodB.id,
        items: {
          create: [{ componentProductId: commonComponent.id, quantity: new Decimal(20), unitId: unit.id }],
        },
      },
    });

    // Total sugar stock = 70.
    await prisma.warehouseStock.create({
      data: { warehouseId: wh2.id, productId: commonComponent.id, quantity: new Decimal(70) },
    });

    // Order 2 Product A (20 sugar) + 3 Product B (60 sugar) = 80 sugar (exceeds 70)
    const orderInput = {
      customerName: "Aggregate Share Test",
      orderType: "TAKEAWAY" as any,
      items: [
        { productId: prodA.id, quantity: 2 },
        { productId: prodB.id, quantity: 3 },
      ],
    };

    await assert.rejects(
      async () => {
        await createOrder(cashierUser.id, orderInput);
      },
      /Insufficient inventory/
    );
  });

  // 8. Finished good without recipe
  await t.test("Scenario 8 — Direct finished good stock checks", async () => {
    const directProd = await prisma.product.create({
      data: { name: "Direct Water", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(5000), unitId: unit.id },
    });

    await prisma.warehouseStock.createMany({
      data: [
        { warehouseId: wh1.id, productId: directProd.id, quantity: new Decimal(50) },
        { warehouseId: wh2.id, productId: directProd.id, quantity: new Decimal(20) },
      ],
    });

    const products = await getAllProducts(true);
    const prod = products.find((p: any) => p.id === directProd.id);
    assert.ok(prod);
    assert.equal(prod.availableStock, 70);
  });

  // 9. trackInventory = false
  await t.test("Scenario 9 — Non-stock-tracked product", async () => {
    const untracked = await prisma.product.create({
      data: { name: "Unlimited Drink", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: false, price: new Decimal(8000), unitId: unit.id },
    });

    const products = await getAllProducts(true);
    const prod = products.find((p: any) => p.id === untracked.id);
    assert.ok(prod);
    assert.equal(prod.availableStock, null);
  });

  // 10. Concurrent checkout requests simulation
  await t.test("Scenario 10 — Concurrent checkout requests validation", async () => {
    const concurrentComponent = await prisma.product.create({
      data: { name: "Concurrent Item", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, price: 0, unitId: unit.id },
    });
    const finishedProd = await prisma.product.create({
      data: { name: "Finished Concurrent Product", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(10000), unitId: unit.id },
    });

    await prisma.recipe.create({
      data: {
        productId: finishedProd.id,
        items: {
          create: [{ componentProductId: concurrentComponent.id, quantity: new Decimal(1), unitId: unit.id }],
        },
      },
    });

    // Total stock = 1
    await prisma.warehouseStock.create({
      data: { warehouseId: wh2.id, productId: concurrentComponent.id, quantity: new Decimal(1) },
    });

    const orderInput = {
      customerName: "Concurrent Checkout Tester",
      orderType: "TAKEAWAY" as any,
      items: [{ productId: finishedProd.id, quantity: 1 }],
    };

    // Spawn checkout tasks concurrently
    const results = await Promise.allSettled([
      createOrder(cashierUser.id, orderInput),
      createOrder(cashierUser.id, orderInput),
    ]);

    const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
    const rejectedCount = results.filter((r) => r.status === "rejected").length;

    assert.equal(fulfilledCount, 1, "Only one concurrent order should succeed");
    assert.equal(rejectedCount, 1, "The second concurrent order must be rejected");
  });
});
