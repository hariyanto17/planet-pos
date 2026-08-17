import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { createOrder, updateOrderStatus, confirmPayment } from "./service";
import { getKitchenQueue } from "./queue.service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("Order Timeline and Status Transitions Regression Tests", async (t) => {
  // Setup: Find cashier user, active shift, and product from seed
  const cashierUser = await prisma.user.findFirst({ where: { role: "CASHIER" } });
  if (!cashierUser) {
    throw new Error("Cashier user not found in database. Run seed first.");
  }

  let kitchenUser = await prisma.user.findFirst({ where: { role: "KITCHEN" } });
  if (!kitchenUser) {
    kitchenUser = await prisma.user.create({
      data: {
        username: "kitchen_tester",
        fullName: "Kitchen Tester",
        passwordHash: "test_hash",
        role: "KITCHEN",
        isActive: true,
      },
    });
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

  let product = await prisma.sellableProduct.findFirst({ where: { isActive: true, recipe: null } });
  if (!product) {
    product = await prisma.sellableProduct.create({
      data: {
        name: "Test Direct Sale Item",
        price: new Decimal(15000),
        isActive: true,
        productType: "DIRECT_SALE",
      }
    });
  }

  const table = await prisma.table.findFirst({ where: { isActive: true } }) || await prisma.table.create({
    data: {
      code: "T1",
      name: "T1",
      isActive: true,
    }
  });

  // Define shared variables for cashier flow
  let cashierOrderId: string = "";

  await t.test("Test 1 — CASHIER order creation (starts at NEW)", async () => {
    const orderInput = {
      customerName: "Cashier Tester",
      orderType: "TAKEAWAY" as any,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };

    const order = await createOrder(cashierUser.id, orderInput);
    cashierOrderId = order.id;

    assert.equal(order.status, OrderStatus.NEW, "Order should initially be NEW");

    const dbOrder = await prisma.order.findUnique({
      where: { id: cashierOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.NEW);
    assert.equal(dbOrder.timelines.length, 1);
    assert.equal(dbOrder.timelines[0].status, OrderStatus.NEW);
  });

  await t.test("Test 2 — CASHIER order paid (remains NEW)", async () => {
    const order = await prisma.order.findUnique({
      where: { id: cashierOrderId },
    });
    assert.ok(order);

    // Create a PAID payment
    await prisma.payment.create({
      data: {
        orderId: cashierOrderId,
        amount: order.grandTotal,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        confirmedById: cashierUser.id,
        confirmedAt: new Date(),
        cashierShiftId: shiftId,
      },
    });

    await prisma.$transaction(async (tx) => {
      await confirmPayment(cashierOrderId, order.grandTotal, cashierUser.id, tx);
    });

    const dbOrder = await prisma.order.findUnique({
      where: { id: cashierOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.NEW, "Order status should remain NEW after payment");
    assert.equal(dbOrder.timelines.length, 1);
    assert.equal(dbOrder.timelines[0].status, OrderStatus.NEW);
  });

  await t.test("Test 3 — CASHIER kitchen starts preparing (NEW -> PREPARING)", async () => {
    // Attempting update status by cashier (should fail role check)
    await assert.rejects(
      async () => {
        await updateOrderStatus(cashierOrderId, OrderStatus.PREPARING, cashierUser.id);
      },
      /Only KITCHEN or ADMIN roles/
    );

    // Valid update status by kitchen
    await updateOrderStatus(cashierOrderId, OrderStatus.PREPARING, kitchenUser.id);

    const dbOrder = await prisma.order.findUnique({
      where: { id: cashierOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.PREPARING);
    assert.equal(dbOrder.timelines.length, 2);
    assert.equal(dbOrder.timelines[0].status, OrderStatus.NEW);
    assert.equal(dbOrder.timelines[1].status, OrderStatus.PREPARING);
  });

  await t.test("Test 4 — CASHIER kitchen marks ready (PREPARING -> READY)", async () => {
    await updateOrderStatus(cashierOrderId, OrderStatus.READY, kitchenUser.id);

    const dbOrder = await prisma.order.findUnique({
      where: { id: cashierOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.READY);
    assert.equal(dbOrder.timelines.length, 3);
    assert.equal(dbOrder.timelines[0].status, OrderStatus.NEW);
    assert.equal(dbOrder.timelines[1].status, OrderStatus.PREPARING);
    assert.equal(dbOrder.timelines[2].status, OrderStatus.READY);
  });

  await t.test("Test 5 — CASHIER kitchen completes (READY -> COMPLETED)", async () => {
    await updateOrderStatus(cashierOrderId, OrderStatus.COMPLETED, kitchenUser.id);

    const dbOrder = await prisma.order.findUnique({
      where: { id: cashierOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.COMPLETED);
    assert.equal(dbOrder.timelines.length, 4);
    assert.equal(dbOrder.timelines[0].status, OrderStatus.NEW);
    assert.equal(dbOrder.timelines[1].status, OrderStatus.PREPARING);
    assert.equal(dbOrder.timelines[2].status, OrderStatus.READY);
    assert.equal(dbOrder.timelines[3].status, OrderStatus.COMPLETED);
  });

  // Define shared variables for self order flow
  let selfOrderId: string = "";

  await t.test("Test 6 — SELF_ORDER creation", async () => {
    const orderInput = {
      customerName: "Self Tester",
      orderType: "DINE_IN" as any,
      tableId: table.id,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };

    // Self-order is created without cashierId (null)
    const order = await createOrder(null, orderInput);
    selfOrderId = order.id;

    assert.equal(order.status, OrderStatus.NEW);

    const dbOrder = await prisma.order.findUnique({
      where: { id: selfOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.NEW);
    assert.equal(dbOrder.timelines.length, 1);
    assert.equal(dbOrder.timelines[0].status, OrderStatus.NEW);
  });

  await t.test("Test 7 — SELF_ORDER payment", async () => {
    const order = await prisma.order.findUnique({
      where: { id: selfOrderId },
    });
    assert.ok(order);

    // Create a PAID payment to simulate payment confirmation
    await prisma.payment.create({
      data: {
        orderId: selfOrderId,
        amount: order.grandTotal,
        method: PaymentMethod.QRIS,
        status: PaymentStatus.PAID,
        confirmedAt: new Date(),
        cashierShiftId: null, // Self-order payments don't require shift id if done via gateway
      },
    });

    await prisma.$transaction(async (tx) => {
      await confirmPayment(selfOrderId, order.grandTotal, null, tx);
    });

    const dbOrder = await prisma.order.findUnique({
      where: { id: selfOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.NEW, "Self order should remain NEW after payment");
    assert.equal(dbOrder.timelines.length, 1);
    assert.equal(dbOrder.timelines[0].status, OrderStatus.NEW);
  });

  await t.test("Test 8 — SELF_ORDER kitchen starts", async () => {
    await updateOrderStatus(selfOrderId, OrderStatus.PREPARING, kitchenUser.id);

    const dbOrder = await prisma.order.findUnique({
      where: { id: selfOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.PREPARING);
    assert.equal(dbOrder.timelines.length, 2);
    assert.equal(dbOrder.timelines[1].status, OrderStatus.PREPARING);
  });

  await t.test("Test 9 — SELF_ORDER kitchen ready", async () => {
    await updateOrderStatus(selfOrderId, OrderStatus.READY, kitchenUser.id);

    const dbOrder = await prisma.order.findUnique({
      where: { id: selfOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.READY);
    assert.equal(dbOrder.timelines.length, 3);
    assert.equal(dbOrder.timelines[2].status, OrderStatus.READY);
  });

  await t.test("Test 10 — SELF_ORDER completion", async () => {
    await updateOrderStatus(selfOrderId, OrderStatus.COMPLETED, kitchenUser.id);

    const dbOrder = await prisma.order.findUnique({
      where: { id: selfOrderId },
      include: { timelines: { orderBy: { createdAt: "asc" } } },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.status, OrderStatus.COMPLETED);
    assert.equal(dbOrder.timelines.length, 4);
    assert.equal(dbOrder.timelines[3].status, OrderStatus.COMPLETED);
  });

  await t.test("Test 11 — KDS queue contains NEW cashier order", async () => {
    const orderInput = {
      customerName: "KDS Queue Tester 1",
      orderType: "TAKEAWAY" as any,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };
    const order = await createOrder(cashierUser.id, orderInput);
    
    const queue = await getKitchenQueue();
    const found = queue.some((o) => o.id === order.id);
    assert.ok(found, "NEW cashier order must appear in KDS queue");
  });

  await t.test("Test 12 — KDS queue contains PAID but NEW cashier order", async () => {
    const orderInput = {
      customerName: "KDS Queue Tester 2",
      orderType: "TAKEAWAY" as any,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };
    const order = await createOrder(cashierUser.id, orderInput);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.grandTotal,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        confirmedById: cashierUser.id,
        confirmedAt: new Date(),
        cashierShiftId: shiftId,
      },
    });

    await prisma.$transaction(async (tx) => {
      await confirmPayment(order.id, order.grandTotal, cashierUser.id, tx);
    });

    const queue = await getKitchenQueue();
    const found = queue.some((o) => o.id === order.id);
    assert.ok(found, "Paid but NEW cashier order must appear in KDS queue");
  });

  await t.test("Test 13 — KDS queue contains SELF_ORDER in NEW status", async () => {
    const orderInput = {
      customerName: "KDS Queue Tester 3",
      orderType: "DINE_IN" as any,
      tableId: table.id,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };
    const order = await createOrder(null, orderInput);

    const queue = await getKitchenQueue();
    const found = queue.some((o) => o.id === order.id);
    assert.ok(found, "NEW self-order must appear in KDS queue");
  });

  await t.test("Test 14 — Completed order is not in active queue", async () => {
    const orderInput = {
      customerName: "KDS Queue Tester 4",
      orderType: "TAKEAWAY" as any,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };
    const order = await createOrder(cashierUser.id, orderInput);
    await updateOrderStatus(order.id, OrderStatus.PREPARING, kitchenUser.id);
    await updateOrderStatus(order.id, OrderStatus.READY, kitchenUser.id);
    await updateOrderStatus(order.id, OrderStatus.COMPLETED, kitchenUser.id);

    const queue = await getKitchenQueue();
    const found = queue.some((o) => o.id === order.id);
    assert.ok(!found, "COMPLETED order must not appear in KDS queue");
  });

  await t.test("Test 15 — Cancelled order is not in active queue", async () => {
    const orderInput = {
      customerName: "KDS Queue Tester 5",
      orderType: "TAKEAWAY" as any,
      items: [{ sellableProductId: product.id, quantity: 1 }],
    };
    const order = await createOrder(cashierUser.id, orderInput);
    await updateOrderStatus(order.id, OrderStatus.CANCELLED, cashierUser.id);

    const queue = await getKitchenQueue();
    const found = queue.some((o) => o.id === order.id);
    assert.ok(!found, "CANCELLED order must not appear in KDS queue");
  });
});
