import { PrismaClient, OrderStatus, OrderSource, StockMovementType, StockReferenceType, OrderType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  getInventorySummary,
  getProductStockList,
  createStockReceipt,
  adjustStock,
  removeAsWaste,
  getStockMovements,
} from "../../src/modules/inventory/service";
import { updateOrderStatus, confirmPayment } from "../../src/modules/orders/service";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== STARTING INVENTORY LITE MANUAL VERIFICATION SUITE ===");

  // Resolve admin user
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("Please run baseline user seeder first.");
    process.exit(1);
  }

  // Resolve concession warehouse
  const concessionWh = await prisma.warehouse.findFirst({ where: { code: "CONCESSION" } });
  if (!concessionWh) {
    console.error("Please run seed-inventory-lite first.");
    process.exit(1);
  }

  // Resolve a tracked product
  const product = await prisma.product.findFirst({
    where: { trackInventory: true, deletedAt: null },
  });

  if (!product) {
    console.error("No tracked products found. Run seed-inventory-lite first.");
    process.exit(1);
  }

  console.log(`Testing with product: ${product.name} (ID: ${product.id})`);

  // Test Case 1: Get Initial stock summary & check matching balance
  const initialSummary = await getInventorySummary();
  console.log("Initial low stock products count:", initialSummary.lowStockProducts);

  const initialStockList = await getProductStockList({
    warehouseId: concessionWh.id,
    search: product.name,
  });
  const initialQty = initialStockList.data[0]?.quantity || 0;
  console.log(`Initial stock quantity of ${product.name} in CONCESSION: ${initialQty}`);

  // Test Case 2: Receive Stock (+20)
  console.log("Executing createStockReceipt(+20)...");
  const balanceAfterReceive = await createStockReceipt(admin.id, {
    productId: product.id,
    warehouseId: concessionWh.id,
    quantity: 20.0,
    remarks: "Test manual replenishment",
  });
  console.log(`Balance after receipt: ${balanceAfterReceive.toString()}`);
  if (Number(balanceAfterReceive) !== initialQty + 20) {
    throw new Error("Receive Stock balance check failed");
  }

  // Test Case 3: Adjust Stock (-5)
  console.log("Executing adjustStock(-5)...");
  const balanceAfterAdjust = await adjustStock(admin.id, {
    productId: product.id,
    warehouseId: concessionWh.id,
    quantity: -5.0,
    remarks: "Test negative adjustment",
  });
  console.log(`Balance after adjustment: ${balanceAfterAdjust.toString()}`);
  if (Number(balanceAfterAdjust) !== initialQty + 15) {
    throw new Error("Adjust Stock balance check failed");
  }

  // Test Case 4: Record Waste (-10)
  console.log("Executing removeAsWaste(10)...");
  const balanceAfterWaste = await removeAsWaste(admin.id, {
    productId: product.id,
    warehouseId: concessionWh.id,
    quantity: 10.0,
    remarks: "Test waste recording",
  });
  console.log(`Balance after waste removal: ${balanceAfterWaste.toString()}`);
  if (Number(balanceAfterWaste) !== initialQty + 5) {
    throw new Error("Waste Stock balance check failed");
  }

  // Test Case 5: Verify ledger audit trail matches expected quantity values
  const movements = await getStockMovements({
    productId: product.id,
    warehouseId: concessionWh.id,
    limit: 5,
  });

  console.log("Latest stock movement logs:");
  movements.data.slice(0, 3).forEach((m) => {
    console.log(
      `Type: ${m.movementType}, Quantity: ${m.quantity}, Before: ${m.quantityBefore}, After: ${m.quantityAfter}, User: ${m.createdBy}, Remarks: ${m.remarks}`
    );
  });

  // Verify balance matches cached snapshot
  const snapshot = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId: concessionWh.id,
        productId: product.id,
      },
    },
  });

  const cumulativeSum = await prisma.stockLedger.aggregate({
    where: {
      warehouseId: concessionWh.id,
      productId: product.id,
    },
    _sum: {
      quantity: true,
    },
  });

  console.log(`Snapshot quantity cached: ${snapshot?.quantity.toString()}`);
  console.log(`Ledger cumulative sum: ${cumulativeSum._sum.quantity?.toString()}`);

  if (snapshot?.quantity.toString() !== cumulativeSum._sum.quantity?.toString()) {
    throw new Error("Inventory ledger discrepancy detected: cumulative sum does not match snapshot quantity cached");
  }

  // Test Case 6: Mock POS order completion deduction
  console.log("Mocking completed order checkout loop...");
  const orderNum = `TEST-ORD-${Date.now()}`;
  const displayNum = `A${Math.floor(Math.random() * 1000000)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber: orderNum,
      displayNumber: displayNum,
      dailyNumber: 1,
      customerName: "Auditor Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 10000,
      subtotal: 10000,
      discountAmount: 0,
      taxAmount: 0,
      cashierId: admin.id,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productCategory: "Food",
          unitPrice: 10000,
          quantity: 2,
          subtotal: 20000,
          discountAmount: 0,
        },
      },
    },
  });

  console.log(`Order created in NEW state: ${order.id}`);

  // Transition order to PREPARING
  console.log("Transitioning order to PREPARING...");
  await updateOrderStatus(order.id, OrderStatus.PREPARING, admin.id);

  // Transition order to READY
  console.log("Transitioning order status to READY...");
  await updateOrderStatus(order.id, OrderStatus.READY, admin.id);

  // Confirm payment (which transitions to COMPLETED)
  console.log("Confirming order payment to transition to COMPLETED...");
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        amount: new Decimal(10000),
        method: "CASH",
        status: "PAID",
        confirmedById: admin.id,
        confirmedAt: new Date(),
      },
    });

    await confirmPayment(order.id, new Decimal(10000), admin.id, tx);
  });

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
  });
  console.log(`Updated Order Status: ${updatedOrder?.status}`);

  if (updatedOrder?.status !== OrderStatus.COMPLETED) {
    throw new Error("Order status failed to transition to COMPLETED");
  }

  const stockAfterSale = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId: concessionWh.id,
        productId: product.id,
      },
    },
  });
  console.log(`Stock after order completion: ${stockAfterSale?.quantity.toString()}`);
  if (Number(stockAfterSale?.quantity) !== Number(snapshot?.quantity) - 2) {
    throw new Error("POS Order stock deduction check failed");
  }

  const saleLedger = await prisma.stockLedger.findFirst({
    where: {
      referenceId: order.id,
      movementType: StockMovementType.SALE,
    },
  });
  console.log(
    `Validated SALE Ledger Entry: Qty: ${saleLedger?.quantity.toString()}, Before: ${saleLedger?.quantityBefore.toString()}, After: ${saleLedger?.quantityAfter.toString()}`
  );

  // Test Case 7: Attempt checkout with insufficient stock
  console.log("Mocking order with insufficient stock...");
  const deficitOrderNum = `TEST-ORD-DEF-${Date.now()}`;
  const deficitDisplayNum = `B${Math.floor(Math.random() * 1000000)}`;
  const deficitOrder = await prisma.order.create({
    data: {
      orderNumber: deficitOrderNum,
      displayNumber: deficitDisplayNum,
      dailyNumber: 2,
      customerName: "Auditor Deficit Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 10000,
      subtotal: 10000,
      discountAmount: 0,
      taxAmount: 0,
      cashierId: admin.id,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productCategory: "Food",
          unitPrice: 10000,
          quantity: 10000, // Deficit quantity!
          subtotal: 100000000,
          discountAmount: 0,
        },
      },
    },
  });

  // Transition order to PREPARING
  await updateOrderStatus(deficitOrder.id, OrderStatus.PREPARING, admin.id);

  // Transition order to READY
  await updateOrderStatus(deficitOrder.id, OrderStatus.READY, admin.id);

  try {
    console.log("Transitioning deficit order payment (expecting rollback)...");
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: deficitOrder.id,
          amount: new Decimal(10000),
          method: "CASH",
          status: "PAID",
          confirmedById: admin.id,
          confirmedAt: new Date(),
        },
      });

      await confirmPayment(deficitOrder.id, new Decimal(10000), admin.id, tx);
    });
    throw new Error("Deficit payment confirmed without throwing error!");
  } catch (err: any) {
    console.log(`Caught expected stock exception: "${err.message}"`);
    if (!err.message.includes("Insufficient inventory")) {
      throw new Error(`Unexpected error message thrown: ${err.message}`);
    }
  }

  // Verify order remains in READY state (indicating transaction rolled back completely)
  const finalDeficitOrderState = await prisma.order.findUnique({
    where: { id: deficitOrder.id },
  });
  console.log(`Deficit Order final status: ${finalDeficitOrderState?.status} (Expected: READY)`);
  if (finalDeficitOrderState?.status !== OrderStatus.READY) {
    throw new Error("Prisma transaction failed to rollback deficit order!");
  }

  console.log("=== MANUAL VERIFICATION SUITE PASSED SUCCESSFULLY ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Verification suite failed with error:", err);
  process.exit(1);
});
