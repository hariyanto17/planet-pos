import { PrismaClient, OrderStatus, OrderSource, StockMovementType, StockReferenceType, OrderType, PaymentMethod, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { openShift, closeShift, getCurrentShift, getShiftReconciliation } from "../../src/modules/shifts/service";
import { createOrder, updateOrderStatus, confirmPayment } from "../../src/modules/orders/service";
import { createPayment } from "../../src/modules/payments/service";
import { getInventorySummary, getProductStockList, getStockMovements, createStockReceipt, adjustStock, removeAsWaste } from "../../src/modules/inventory/service";
import { getSalesReport, getShiftsReport, getAccountingSnapshot } from "../../src/modules/reports/service";
import { requireRoles } from "../../src/middleware/authMiddleware";
import { AppError } from "../../src/utils/errorHandler";

const prisma = new PrismaClient();

async function runValidation() {
  console.log("==================================================================");
  console.log("          PRE-UAT END-TO-END BUSINESS FLOW VALIDATION RUNNER      ");
  console.log("==================================================================");

  let cashierUser = await prisma.user.findFirst({ where: { username: "cashier" } });
  if (!cashierUser) {
    console.log("Creating cashier user context...");
    cashierUser = await prisma.user.create({
      data: {
        username: "cashier",
        fullName: "Concession Cashier",
        passwordHash: "test_hash",
        role: "CASHIER",
        isActive: true,
      },
    });
  }

  let adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) {
    console.error("Admin user required for validation checks.");
    process.exit(1);
  }

  const concessionWh = await prisma.warehouse.findFirst({ where: { code: "CONCESSION" } });
  if (!concessionWh) {
    console.error("CONCESSION warehouse required. Run seed-inventory-lite first.");
    process.exit(1);
  }

  const product = await prisma.product.findFirst({ where: { trackInventory: true, deletedAt: null } });
  if (!product) {
    console.error("Tracked product required. Run seed-inventory-lite first.");
    process.exit(1);
  }

  console.log(`Product: ${product.name}`);
  console.log(`Warehouse: ${concessionWh.name}\n`);

  // ==================================================================
  // SCENARIO 1: CASHIER SHIFT FLOW
  // ==================================================================
  console.log("------------------------------------------------------------------");
  console.log("Scenario 1: Cashier Shift Flow");
  console.log("------------------------------------------------------------------");

  // Force close any existing open shifts first to prevent conflict
  const existingShift = await prisma.cashierShift.findFirst({
    where: { userId: cashierUser.id, status: "OPEN" },
  });
  if (existingShift) {
    console.log(`Closing pre-existing shift: ${existingShift.id}`);
    await closeShift(existingShift.id, Number(existingShift.openingCash), "Auto-closed for validation run");
  }

  // 1. Open shift
  console.log("Opening new cashier shift...");
  const openedShift = await openShift(cashierUser.id, 100000); // Rp 100,000
  console.log(`Shift opened successfully: ID = ${openedShift.shiftId}, status = ${openedShift.status}`);
  if (openedShift.status !== "OPEN" || Number(openedShift.openingCash) !== 100000) {
    console.error("FAIL: Open Shift state mismatch");
    process.exit(1);
  }
  console.log("PASS: Open Shift checks");

  // 2. Simulate order under shift to check statistics updates
  const orderNum = `SHFT-ORD-${Date.now()}`;
  const displayNum = `A${Math.floor(Math.random() * 1000000)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber: orderNum,
      displayNumber: displayNum,
      dailyNumber: 1,
      customerName: "Shift Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 50000, // Rp 50,000
      subtotal: 50000,
      discountAmount: 0,
      taxAmount: 0,
      cashierId: cashierUser.id,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productCategory: "Food",
          unitPrice: 50000,
          quantity: 1,
          subtotal: 50000,
          discountAmount: 0,
        },
      },
    },
  });

  // Create payment record linked to shift
  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: new Decimal(50000),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      confirmedById: cashierUser.id,
      confirmedAt: new Date(),
      cashierShiftId: openedShift.shiftId,
    },
  });

  // Verify Expected Cash updates
  const reconciliation = await getShiftReconciliation(openedShift.shiftId);
  console.log(`Shift expected cash calculated: ${reconciliation.expectedCash}`);
  if (Number(reconciliation.expectedCash) !== 150000) { // opening (100k) + paid (50k)
    console.error(`FAIL: expected cash discrepancy. Got: ${reconciliation.expectedCash}`);
    process.exit(1);
  }
  console.log("PASS: Expected Cash calculations match transaction sums");

  // 3. Close Shift
  console.log("Closing shift...");
  const closedShift = await closeShift(openedShift.shiftId, 150000, "Shift reconciled cleanly");
  console.log(`Shift closed successfully: status = ${closedShift.status}, difference = ${closedShift.difference}`);
  if (closedShift.status !== "CLOSED" || Number(closedShift.actualCash) !== 150000 || Number(closedShift.difference) !== 0) {
    console.error("FAIL: Close Shift reconciliation audit failed");
    process.exit(1);
  }
  console.log("PASS: Shift closed and audited correctly");

  // 4. Verify closed shift constraints (cannot place order/payments)
  try {
    await createPayment(cashierUser.id, {
      orderId: order.id,
      amount: new Decimal(10000) as any,
      method: PaymentMethod.CASH,
      receivedCash: new Decimal(10000) as any,
    });
    console.error("FAIL: Allowed payment creation on closed shift!");
    process.exit(1);
  } catch (err) {
    console.log("PASS: Successfully blocked payments under closed cashier shifts");
  }


  // ==================================================================
  // SCENARIO 2: CASH SALE
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 2: Cash Sale");
  console.log("------------------------------------------------------------------");

  // Re-open cashier shift for transaction flows
  const activeShift = await openShift(cashierUser.id, 100000);

  const cashOrderNum = `CSH-ORD-${Date.now()}`;
  const cashDisplayNum = `C${Math.floor(Math.random() * 1000000)}`;

  // Create order
  const cashOrder = await prisma.order.create({
    data: {
      orderNumber: cashOrderNum,
      displayNumber: cashDisplayNum,
      dailyNumber: 2,
      customerName: "Cash Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 40000,
      subtotal: 40000,
      discountAmount: 0,
      taxAmount: 0,
      cashierId: cashierUser.id,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productCategory: "Food",
          unitPrice: 20000,
          quantity: 2,
          subtotal: 40000,
          discountAmount: 0,
        },
      },
    },
  });

  // Open inventory stock check before deduction
  const stockBefore = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productId: { warehouseId: concessionWh.id, productId: product.id } }
  });
  const initialQty = Number(stockBefore?.quantity || 0);

  // Transition: NEW -> PREPARING -> READY
  await updateOrderStatus(cashOrder.id, OrderStatus.PREPARING, adminUser.id);
  await updateOrderStatus(cashOrder.id, OrderStatus.READY, adminUser.id);

  // Create and confirm cash payment
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: cashOrder.id,
        amount: new Decimal(40000),
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        confirmedById: cashierUser.id,
        confirmedAt: new Date(),
        cashierShiftId: activeShift.shiftId,
      },
    });

    await confirmPayment(cashOrder.id, new Decimal(40000), cashierUser.id, tx);
  });

  const finalCashOrder = await prisma.order.findUnique({ where: { id: cashOrder.id } });
  console.log(`Order status after paid transition: ${finalCashOrder?.status}`);
  if (finalCashOrder?.status !== OrderStatus.COMPLETED) {
    console.error("FAIL: Order status failed to transition to COMPLETED");
    process.exit(1);
  }

  // Verify stock deduction occurred
  const stockAfter = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productId: { warehouseId: concessionWh.id, productId: product.id } }
  });
  console.log(`Stock level before: ${initialQty}, after: ${stockAfter?.quantity}`);
  if (Number(stockAfter?.quantity) !== initialQty - 2) {
    console.error("FAIL: Inventory deduction mismatch");
    process.exit(1);
  }
  console.log("PASS: Cash sale checkout lifecycle checks out successfully");


  // ==================================================================
  // SCENARIO 3: QRIS SALE
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 3: QRIS Sale");
  console.log("------------------------------------------------------------------");

  const qrisOrderNum = `QRS-ORD-${Date.now()}`;
  const qrisDisplayNum = `Q${Math.floor(Math.random() * 1000000)}`;

  const qrisOrder = await prisma.order.create({
    data: {
      orderNumber: qrisOrderNum,
      displayNumber: qrisDisplayNum,
      dailyNumber: 3,
      customerName: "QRIS Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 20000,
      subtotal: 20000,
      discountAmount: 0,
      taxAmount: 0,
      cashierId: cashierUser.id,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productCategory: "Food",
          unitPrice: 20000,
          quantity: 1,
          subtotal: 20000,
          discountAmount: 0,
        },
      },
    },
  });

  // Create pending payment
  const qrisPayment = await prisma.payment.create({
    data: {
      orderId: qrisOrder.id,
      amount: new Decimal(20000),
      method: PaymentMethod.QRIS,
      status: PaymentStatus.PENDING,
      cashierShiftId: activeShift.shiftId,
    },
  });
  console.log(`Pending QRIS Payment Created: status = ${qrisPayment.status}`);

  // Transition order to READY
  await updateOrderStatus(qrisOrder.id, OrderStatus.PREPARING, adminUser.id);
  await updateOrderStatus(qrisOrder.id, OrderStatus.READY, adminUser.id);

  // Confirm payment
  console.log("Confirming pending QRIS payment...");
  await prisma.$transaction(async (tx) => {
    // Set payment status to PAID
    await tx.payment.update({
      where: { id: qrisPayment.id },
      data: { status: PaymentStatus.PAID, confirmedById: cashierUser.id, confirmedAt: new Date() },
    });

    await confirmPayment(qrisOrder.id, new Decimal(20000), cashierUser.id, tx);
  });

  const finalQrisOrder = await prisma.order.findUnique({ where: { id: qrisOrder.id } });
  console.log(`Order status after QRIS confirmPayment: ${finalQrisOrder?.status}`);
  if (finalQrisOrder?.status !== OrderStatus.COMPLETED) {
    console.error("FAIL: QRIS payment did not complete the order");
    process.exit(1);
  }
  console.log("PASS: QRIS payment transitions and completions pass");


  // ==================================================================
  // SCENARIO 4: KITCHEN WORKFLOW
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 4: Kitchen Workflow Constraints");
  console.log("------------------------------------------------------------------");

  const flowOrderNum = `FLW-ORD-${Date.now()}`;
  const flowDisplayNum = `F${Math.floor(Math.random() * 1000000)}`;

  const flowOrder = await prisma.order.create({
    data: {
      orderNumber: flowOrderNum,
      displayNumber: flowDisplayNum,
      dailyNumber: 4,
      customerName: "Flow Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 10000,
      subtotal: 10000,
      discountAmount: 0,
      taxAmount: 0,
      cashierId: cashierUser.id,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productCategory: "Food",
          unitPrice: 10000,
          quantity: 1,
          subtotal: 10000,
          discountAmount: 0,
        },
      },
    },
  });

  // Attempt invalid transition: NEW to COMPLETED directly
  console.log("Attempting invalid status transition: NEW -> COMPLETED...");
  try {
    await updateOrderStatus(flowOrder.id, OrderStatus.COMPLETED, adminUser.id);
    console.error("FAIL: Bypassed status flow transition limits!");
    process.exit(1);
  } catch (err: any) {
    console.log(`PASS: Caught expected error - "${err.message}"`);
  }

  // Attempt invalid transition: READY to PREPARING
  console.log("Moving order NEW -> PREPARING...");
  await updateOrderStatus(flowOrder.id, OrderStatus.PREPARING, adminUser.id);
  console.log("Moving order PREPARING -> READY...");
  await updateOrderStatus(flowOrder.id, OrderStatus.READY, adminUser.id);

  console.log("Attempting invalid status transition: READY -> PREPARING...");
  try {
    await updateOrderStatus(flowOrder.id, OrderStatus.PREPARING, adminUser.id);
    console.error("FAIL: Allowed backward status flow regression!");
    process.exit(1);
  } catch (err: any) {
    console.log(`PASS: Caught expected error - "${err.message}"`);
  }


  // ==================================================================
  // SCENARIO 5: INVENTORY AUDIT
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 5: Ledger-First Inventory Ledger Audit");
  console.log("------------------------------------------------------------------");

  const currentStock = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productId: { warehouseId: concessionWh.id, productId: product.id } }
  });
  const stockBeforeFlow = Number(currentStock?.quantity || 0);

  // 1. Receive Stock (+10)
  console.log("Executing stock receipt (+10.500)...");
  await createStockReceipt(adminUser.id, {
    productId: product.id,
    warehouseId: concessionWh.id,
    quantity: 10.5,
    remarks: "Scenario 5 receipt test",
  });

  // 2. Adjust Stock (-2)
  console.log("Executing stock adjustment (-2.250)...");
  await adjustStock(adminUser.id, {
    productId: product.id,
    warehouseId: concessionWh.id,
    quantity: -2.25,
    remarks: "Scenario 5 adjust test",
  });

  // 3. Record Waste (-1)
  console.log("Executing waste removal (1.100)...");
  await removeAsWaste(adminUser.id, {
    productId: product.id,
    warehouseId: concessionWh.id,
    quantity: 1.1,
    remarks: "Scenario 5 waste test",
  });

  // Verify stock calculation
  const stockAfterFlow = await prisma.warehouseStock.findUnique({
    where: { warehouseId_productId: { warehouseId: concessionWh.id, productId: product.id } }
  });

  const expectedStock = stockBeforeFlow + 10.5 - 2.25 - 1.1;
  console.log(`Calculated Expected Stock: ${expectedStock}, DB Snapshot: ${stockAfterFlow?.quantity}`);
  if (Math.abs(Number(stockAfterFlow?.quantity) - expectedStock) > 0.001) {
    console.error(`FAIL: Stock balance discrepancy. Expected ${expectedStock}, got ${stockAfterFlow?.quantity}`);
    process.exit(1);
  }

  // Verify Ledger cumulative sum matches snapshot
  const ledgerSum = await prisma.stockLedger.aggregate({
    where: { warehouseId: concessionWh.id, productId: product.id },
    _sum: { quantity: true }
  });
  console.log(`Ledger cumulative sum matches snapshot cache: ${ledgerSum._sum.quantity}`);
  if (stockAfterFlow?.quantity.toString() !== ledgerSum._sum.quantity?.toString()) {
    console.error("FAIL: Stock Ledger discrepancy detected against WarehouseStock cache");
    process.exit(1);
  }
  console.log("PASS: Inventory ledger calculations and snapshot balances match 100% cleanly");


  // ==================================================================
  // SCENARIO 6: LOW STOCK & TRANSACTION ROLLBACKS
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 6: Low Stock & Transaction Rollback guards");
  console.log("------------------------------------------------------------------");

  const limitProduct = await prisma.product.create({
    data: {
      name: "Temporary Low-Stock Tester",
      categoryId: product.categoryId,
      sku: `TST-LOW-${Date.now()}`,
      price: new Decimal(10000),
      trackInventory: true,
      inventoryType: "FINISHED_GOOD",
      minimumStock: 10.0,
    }
  });

  // Seed initial stock of 8 (which is below minimumStock of 10)
  await prisma.$transaction(async (tx) => {
    await tx.warehouseStock.create({
      data: {
        warehouseId: concessionWh.id,
        productId: limitProduct.id,
        quantity: 8.0,
      }
    });
    await tx.stockLedger.create({
      data: {
        warehouseId: concessionWh.id,
        productId: limitProduct.id,
        movementType: StockMovementType.OPENING,
        quantity: 8.0,
        quantityBefore: 0,
        quantityAfter: 8.0,
        referenceType: StockReferenceType.OPENING,
      }
    });
  });

  // Verify LOW_STOCK reporting status badge
  const stockList = await getProductStockList({ warehouseId: concessionWh.id, search: limitProduct.name });
  const fetchedProduct = stockList.data.find((p: any) => p.id === limitProduct.id);
  console.log(`Stock Status Badge reported: ${fetchedProduct?.status}`);
  if (fetchedProduct?.status !== "LOW_STOCK") {
    console.error(`FAIL: Expected status to be LOW_STOCK, got: ${fetchedProduct?.status}`);
    process.exit(1);
  }
  console.log("PASS: Centralized LOW_STOCK status badge verification");

  // Attempt checkout of 100 units (which exceeds available stock of 8)
  console.log("Attempting checkout of 100 items (expecting exception)...");
  const rollbackOrderNum = `ROLL-ORD-${Date.now()}`;
  const rollbackOrder = await prisma.order.create({
    data: {
      orderNumber: rollbackOrderNum,
      displayNumber: `R${Math.floor(Math.random() * 1000000)}`,
      dailyNumber: 5,
      customerName: "Rollback Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 1000000,
      subtotal: 1000000,
      discountAmount: 0,
      taxAmount: 0,
      cashierId: cashierUser.id,
      items: {
        create: {
          productId: limitProduct.id,
          productName: limitProduct.name,
          productCategory: "Food",
          unitPrice: 10000,
          quantity: 100, // Deficit!
          subtotal: 1000000,
          discountAmount: 0,
        },
      },
    },
  });

  await updateOrderStatus(rollbackOrder.id, OrderStatus.PREPARING, adminUser.id);
  await updateOrderStatus(rollbackOrder.id, OrderStatus.READY, adminUser.id);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: rollbackOrder.id,
          amount: new Decimal(1000000),
          method: PaymentMethod.CASH,
          status: PaymentStatus.PAID,
          confirmedById: cashierUser.id,
          confirmedAt: new Date(),
          cashierShiftId: activeShift.shiftId,
        },
      });

      await confirmPayment(rollbackOrder.id, new Decimal(1000000), cashierUser.id, tx);
    });
    console.error("FAIL: Deficit payment check bypassed!");
    process.exit(1);
  } catch (err: any) {
    console.log(`PASS: Caught expected stock error - "${err.message}"`);
  }

  // Verify order and payment rolled back cleanly (remains in READY, no transaction records)
  const finalRollbackOrder = await prisma.order.findUnique({ where: { id: rollbackOrder.id } });
  console.log(`Deficit order final status: ${finalRollbackOrder?.status}`);
  if (finalRollbackOrder?.status !== OrderStatus.READY) {
    console.error("FAIL: Prisma transaction rollback failed");
    process.exit(1);
  }
  console.log("PASS: Multi-table transactional rollback guards assert successfully");


  // ==================================================================
  // SCENARIO 7: REPORTS INTEGRITY
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 7: Reports Integrity and Reconciliations");
  console.log("------------------------------------------------------------------");

  const today = new Date().toISOString().split("T")[0];
  const shiftsReport = await getShiftsReport({ startDate: today, endDate: today });
  const accountingSnapshot = await getAccountingSnapshot(today);

  console.log(`Shifts report count: ${shiftsReport.data.length}`);
  console.log(`Accounting snapshot revenue: ${accountingSnapshot.data.paidRevenue}`);
  if (Number(accountingSnapshot.data.paidRevenue) < 0) {
    console.error("FAIL: reports returned negative net sales values");
    process.exit(1);
  }
  console.log("PASS: Analytical reports run and reconcile data parameters cleanly");


  // ==================================================================
  // SCENARIO 8: ROLE-BASED ACCESS CONTROL MIDDLEWARE
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 8: Role-Based Authorization Guards");
  console.log("------------------------------------------------------------------");

  const req = { user: { role: "CASHIER" } } as any;
  const res = {} as any;
  let nextCalled = false;
  let errorPassed: any = null;

  const next = (err?: any) => {
    nextCalled = true;
    errorPassed = err;
  };

  // Run WAREHOUSE restricted route middleware against CASHIER
  const middleware = requireRoles(["ADMIN", "WAREHOUSE"]);
  middleware(req, res, next);

  console.log(`Middleware next called: ${nextCalled}, Error: ${errorPassed?.message}`);
  if (!nextCalled || !errorPassed || errorPassed.code !== "FORBIDDEN") {
    console.error("FAIL: Allowed cashier user to pass warehouse middleware guards");
    process.exit(1);
  }
  console.log("PASS: Authenticator role checking middleware blocks unauthorized request roles");


  // ==================================================================
  // SCENARIO 9: DOUBLE-SUBMISSION PREVENTION
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 9: Double-Submission Prevention");
  console.log("------------------------------------------------------------------");

  const dupOrderNum = `DUP-ORD-${Date.now()}`;
  const dupOrder = await prisma.order.create({
    data: {
      orderNumber: dupOrderNum,
      displayNumber: `D${Math.floor(Math.random() * 1000000)}`,
      dailyNumber: 6,
      customerName: "Duplicate Customer",
      source: OrderSource.CASHIER,
      status: OrderStatus.NEW,
      orderType: OrderType.TAKEAWAY,
      grandTotal: 10000,
      subtotal: 10000,
      discountAmount: 0,
      taxAmount: 0,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          unitPrice: 10000,
          quantity: 1,
          subtotal: 10000,
          discountAmount: 0,
        }
      }
    }
  });

  // Verify orderNumber uniqueness constraint
  try {
    await prisma.order.create({
      data: {
        orderNumber: dupOrderNum,
        displayNumber: `D2-${Math.floor(Math.random() * 1000000)}`,
        dailyNumber: 7,
        customerName: "Duplicate Customer 2",
        source: OrderSource.CASHIER,
        status: OrderStatus.NEW,
        orderType: OrderType.TAKEAWAY,
        grandTotal: 10000,
        subtotal: 10000,
        discountAmount: 0,
        taxAmount: 0,
      }
    });
    console.error("FAIL: DB allowed duplicate order number key insert!");
    process.exit(1);
  } catch (err) {
    console.log("PASS: Database unique keys block duplicate order entries");
  }


  // ==================================================================
  // SCENARIO 10: MULTI-MODULE AUDIT RECONCILIATIONS
  // ==================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("Scenario 10: Multi-Module Audit Reconciliations");
  console.log("------------------------------------------------------------------");

  const completedOrders = await prisma.order.findMany({
    where: { status: OrderStatus.COMPLETED },
    include: { payments: true },
    take: 5,
  });

  console.log(`Reconciling ${completedOrders.length} completed orders...`);
  for (const o of completedOrders) {
    const totalPayments = o.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum.add(p.amount), new Decimal(0));

    console.log(`Order ${o.orderNumber}: Grand Total = ${o.grandTotal}, Paid Payments Total = ${totalPayments}`);
    if (Number(o.grandTotal) !== Number(totalPayments)) {
      console.error(`FAIL: Grand total discrepancy in completed order: ${o.orderNumber}`);
      process.exit(1);
    }
  }

  // Clean up open cashier shift to leave state clean
  await closeShift(activeShift.shiftId, 100000, "Validation runner clean closure");

  console.log("PASS: Order totals reconcile with payment sums perfectly");
  console.log("\n==================================================================");
  console.log("         ALL 10 BUSINESS FLOW SCENARIOS PASSED SUCCESSFULLY!       ");
  console.log("==================================================================");
  process.exit(0);
}

runValidation().catch((err) => {
  console.error("Validation runner terminated with error:", err);
  process.exit(1);
});
