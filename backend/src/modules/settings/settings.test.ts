import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, OrderStatus, UserRole } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { getSettings, updateSettings, clearSettingsCache } from "./service";
import { createOrder } from "../orders/service";
import { checkout } from "../checkout/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("Application Settings and AppType Workflow Tests", async (t) => {
  // Reset cache before starting
  clearSettingsCache();

  // Find or create test entities
  const cashierUser = await prisma.user.findFirst({ where: { role: "CASHIER" } });
  if (!cashierUser) {
    throw new Error("Cashier user not found. Run seed first.");
  }

  const activeShift = await prisma.cashierShift.findFirst({
    where: { userId: cashierUser.id, status: "OPEN" },
  });
  const shiftId = activeShift ? activeShift.id : (await prisma.cashierShift.create({
    data: {
      userId: cashierUser.id,
      status: "OPEN",
      openingCash: new Decimal(100000),
      businessDate: new Date(),
    }
  })).id;

  let product = await prisma.sellableProduct.findFirst({ where: { isActive: true } });
  if (!product) {
    product = await prisma.sellableProduct.create({
      data: {
        name: "Settings Test Product",
        price: new Decimal(10000),
        isActive: true,
        productType: "DIRECT_SALE",
      }
    });
  }

  await t.test("1. Retrieve Default Settings", async () => {
    const settings = await getSettings();
    assert.ok(settings);
    assert.equal(settings.appName, "Planet Cinema");
    assert.equal(settings.appType, "SELF_ORDER");
  });

  await t.test("2. Update Settings with Valid Data", async () => {
    const settings = await updateSettings({
      appName: "New Planet Cinema",
      appType: "CASHIER_ONLY" as any,
    });
    assert.equal(settings.appName, "New Planet Cinema");
    assert.equal(settings.appType, "CASHIER_ONLY");

    const fetched = await getSettings();
    assert.equal(fetched.appName, "New Planet Cinema");
    assert.equal(fetched.appType, "CASHIER_ONLY");
  });

  await t.test("2b. Reject CASHIER_ONLY settings if kitchenWarehouseId is null", async () => {
    // First clear/nullify kitchenWarehouseId in SELF_ORDER mode
    await updateSettings({
      appType: "SELF_ORDER" as any,
      kitchenWarehouseId: null,
    });

    // Try to update to CASHIER_ONLY without kitchenWarehouseId
    await assert.rejects(
      async () => {
        await updateSettings({
          appType: "CASHIER_ONLY" as any,
        });
      },
      (err: any) => {
        return err.message === "KITCHEN_WAREHOUSE_NOT_CONFIGURED";
      },
      "Should reject CASHIER_ONLY without kitchenWarehouseId"
    );

    // Restore valid settings for remaining tests
    const kitchenWh = await prisma.warehouse.findFirst({ where: { warehouseType: "KITCHEN_STORAGE" } });
    await updateSettings({
      appType: "CASHIER_ONLY" as any,
      kitchenWarehouseId: kitchenWh?.id || null,
    });
  });

  await t.test("3. Reject SELF_ORDER Order Creation in CASHIER_ONLY Mode", async () => {
    // appType is currently CASHIER_ONLY
    const orderInput = {
      customerName: "Self Order Customer",
      orderType: "DINE_IN" as any,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };

    await assert.rejects(
      async () => {
        // cashierId is null -> SELF_ORDER source
        await createOrder(null, orderInput);
      },
      (err: any) => {
        return err.message === "SELF_ORDER_DISABLED";
      },
      "Should reject self order creation when CASHIER_ONLY is active"
    );
  });

  await t.test("4. CASHIER_ONLY checkout immediately transitions paid order to COMPLETED", async () => {
    const checkoutInput = {
      customerName: "Cashier Customer",
      orderType: "TAKEAWAY" as any,
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: "CASH" as any,
      estimatedCash: 20000,
      receivedCash: 20000,
    };

    const result = await checkout(cashierUser.id, checkoutInput);
    assert.equal(result.paymentStatus, "PAID");
    assert.equal(result.orderStatus, OrderStatus.COMPLETED);

    // Verify order in database
    const dbOrder = await prisma.order.findUnique({
      where: { id: result.orderId }
    });
    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.COMPLETED);
  });

  await t.test("5. Revert back to SELF_ORDER and verify self-order is allowed again", async () => {
    await updateSettings({
      appType: "SELF_ORDER" as any,
    });

    const settings = await getSettings();
    assert.equal(settings.appType, "SELF_ORDER");

    const orderInput = {
      customerName: "Self Order Customer 2",
      orderType: "DINE_IN" as any,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };

    // Should succeed because appType is SELF_ORDER
    const order = await createOrder(null, orderInput);
    assert.ok(order);
    assert.equal(order.status, OrderStatus.NEW);
  });

  // Clean up cache and revert settings to default for regression testing
  clearSettingsCache();
  await updateSettings({
    appName: "Planet Cinema",
    appType: "SELF_ORDER" as any,
  });
});
