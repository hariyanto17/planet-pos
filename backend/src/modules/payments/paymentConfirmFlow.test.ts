import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, PaymentStatus, OrderStatus } from "@prisma/client";
import { checkout } from "../checkout/service";
import { confirmPendingPayment } from "./service";
import { getCurrentShift } from "../shifts/service";

const prisma = new PrismaClient();

test("POS Cashier Checkout and Payment Confirmation Shift Flow Tests", async (t) => {
  // Setup data
  const cashierUser = await prisma.user.findFirst({ where: { role: "CASHIER" } })
    || await prisma.user.create({
      data: { username: "cashier_test_flow", passwordHash: "password", fullName: "Cashier Test Flow", role: "CASHIER" },
    });

  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: "Test Category" },
  });

  const unit = await prisma.unit.findFirst() || await prisma.unit.create({
    data: { name: "Pieces", symbol: "PCS" },
  });

  const product = await prisma.product.findFirst({ where: { name: "Test Flow Fg" } })
    || await prisma.product.create({
      data: { name: "Test Flow Fg", categoryId: category.id, inventoryType: "FINISHED_GOOD", trackInventory: false, price: 10000, unitId: unit.id },
    });

  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "WH_FLOW", name: "Flow WH", warehouseType: "SALES", isActive: true },
    });

  async function cleanupOrderByName(customerName: string) {
    const orders = await prisma.order.findMany({ where: { customerName } });
    const orderIds = orders.map(o => o.id);
    if (orderIds.length > 0) {
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderTax.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderTimeline.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
  }

  async function cleanupOrderId(orderId: string) {
    await prisma.payment.deleteMany({ where: { orderId } });
    await prisma.orderTax.deleteMany({ where: { orderId } });
    await prisma.orderTimeline.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
  }

  // Cleanup past shifts and payments
  await cleanupOrderByName("Test Flow Customer");
  await prisma.cashierShift.deleteMany({ where: { userId: cashierUser.id } });

  await t.test("Scenario 1: Checkout without shift should fail", async () => {
    await assert.rejects(
      checkout(cashierUser.id, {
        customerName: "Test Flow Customer",
        orderType: "DINE_IN",
        paymentMethod: "CASH",
        receivedCash: 10000,
        items: [{ productId: product.id, quantity: 1 }],
      }),
      /Active cashier shift is required/
    );
  });

  await t.test("Scenario 2: Checkout with active shift sets payment as PENDING", async () => {
    // Open a shift
    const shift = await prisma.cashierShift.create({
      data: {
        userId: cashierUser.id,
        status: "OPEN",
        openingCash: 100000,
        openedAt: new Date(),
      },
    });

    const checkoutResult = await checkout(cashierUser.id, {
      customerName: "Test Flow Customer",
      orderType: "DINE_IN",
      paymentMethod: "CASH",
      receivedCash: 20000,
      items: [{ productId: product.id, quantity: 1 }],
    });

    assert.ok(checkoutResult.orderId);

    // Verify payment in DB is PENDING and not linked to shift yet
    const payment = await prisma.payment.findFirst({
      where: { orderId: checkoutResult.orderId },
    });

    assert.ok(payment);
    assert.equal(payment.status, PaymentStatus.PENDING);
    assert.equal(payment.cashierShiftId, null);
    assert.equal(payment.confirmedAt, null);

    // Verify shift stats do not include this pending payment yet
    let shiftStats = await getCurrentShift(cashierUser.id);
    assert.equal(shiftStats.sales, 0, "Pending payments must not count towards sales");

    // Scenario 3: Confirm payment transitions to PAID and links to shift
    const confirmedPayment = await confirmPendingPayment(payment.id, cashierUser.id, {
      receivedCash: 20000,
    });

    assert.equal(confirmedPayment.status, PaymentStatus.PAID);
    assert.equal(confirmedPayment.cashierShiftId, shift.id);
    assert.ok(confirmedPayment.confirmedAt);

    // Verify shift stats now include this paid payment (even if order status is still NEW)
    const order = await prisma.order.findUnique({ where: { id: checkoutResult.orderId } });
    assert.equal(order?.status, OrderStatus.NEW, "Order status remains NEW");

    shiftStats = await getCurrentShift(cashierUser.id);
    assert.equal(shiftStats.sales, 11100, "Paid payment must be counted in shift sales even if order status is NEW");

    // Cleanup
    await cleanupOrderId(checkoutResult.orderId);
    await prisma.cashierShift.delete({ where: { id: shift.id } });
  });
});
