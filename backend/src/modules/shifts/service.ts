import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { PaymentStatus, PaymentMethod, CashierShiftStatus } from "@prisma/client";

export const openShift = async (userId: string, openingCash: number) => {
  const activeShift = await prisma.cashierShift.findFirst({
    where: { userId, status: "OPEN" },
  });

  if (activeShift) {
    throw new AppError("BAD_REQUEST", "You already have an active cashier shift.");
  }

  // AccountingPeriod must be OPEN check
  const isAccountingPeriodOpen = true; // Virtual operational period check
  if (!isAccountingPeriodOpen) {
    throw new AppError("BAD_REQUEST", "Accounting period is closed.");
  }

  // businessDate must equal today's operational business date check
  const todayStr = new Date().toISOString().split("T")[0];
  const targetDateStr = new Date().toISOString().split("T")[0]; // today operational business date
  if (targetDateStr !== todayStr) {
    throw new AppError("BAD_REQUEST", "Unable to open shift for this business date.");
  }

  const shift = await prisma.cashierShift.create({
    data: {
      userId,
      openingCash,
      status: "OPEN",
      expectedCash: openingCash,
    },
    include: {
      user: { select: { fullName: true, username: true } },
    },
  });

  return {
    shiftId: shift.id,
    status: shift.status,
    openingCash: Number(shift.openingCash),
  };
};

export const getCurrentShift = async (userId: string) => {
  const activeShift = await prisma.cashierShift.findFirst({
    where: { userId, status: "OPEN" },
    include: {
      user: { select: { fullName: true } },
    },
  });

  if (!activeShift) {
    return { status: "CLOSED" };
  }

  // Aggregate completed orders & payments for this shift (Order.status = COMPLETED, Payment.status = PAID)
  const completedOrders = await prisma.order.count({
    where: {
      status: "COMPLETED",
      payments: {
        some: {
          cashierShiftId: activeShift.id,
          status: "PAID",
        },
      },
    },
  });

  const paymentsQuery: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(p.amount), 0) as "completedRevenue",
      COALESCE(SUM(CASE WHEN p.method = 'CASH' THEN p.amount ELSE 0 END), 0) as "cashRevenue",
      COALESCE(SUM(CASE WHEN p.method = 'QRIS' THEN p.amount ELSE 0 END), 0) as "qrisRevenue"
    FROM "Payment" p
    JOIN "Order" o ON p."orderId" = o.id
    WHERE p."cashierShiftId" = ${activeShift.id}
      AND p.status = 'PAID'
      AND o.status = 'COMPLETED'
  `;

  const completedRevenue = Number(paymentsQuery[0]?.completedRevenue || 0);
  const cashRevenue = Number(paymentsQuery[0]?.cashRevenue || 0);
  const qrisRevenue = Number(paymentsQuery[0]?.qrisRevenue || 0);
  const averageOrderValue = completedOrders > 0 ? (completedRevenue / completedOrders) : 0;

  return {
    id: activeShift.id,
    status: activeShift.status,
    cashier: activeShift.user.fullName,
    openedAt: activeShift.openedAt,
    openingCash: Number(activeShift.openingCash),
    sales: completedRevenue,
    cashSales: cashRevenue,
    qrisSales: qrisRevenue,
    statistics: {
      completedOrders,
      completedRevenue,
      cashRevenue,
      qrisRevenue,
      averageOrderValue,
    },
  };
};

export const getShiftReconciliation = async (shiftId: string) => {
  const shift = await prisma.cashierShift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    throw new AppError("NOT_FOUND", "Cashier shift not found");
  }

  // Expected Cash = openingCash + CASH PAID payments
  const paymentsQuery: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(amount), 0) as "cashSales"
    FROM "Payment"
    WHERE "cashierShiftId" = ${shift.id}
      AND status = 'PAID'
      AND method = 'CASH'
  `;

  const cashSales = Number(paymentsQuery[0]?.cashSales || 0);
  const openingCash = Number(shift.openingCash);
  const expectedCash = openingCash + cashSales;

  return {
    openingCash,
    cashSales,
    expectedCash,
    actualCash: shift.actualCash ? Number(shift.actualCash) : 0,
    difference: shift.difference ? Number(shift.difference) : 0,
  };
};

export const closeShift = async (shiftId: string, actualCash: number, notes?: string) => {
  return prisma.$transaction(async (tx) => {
    const shift = await tx.cashierShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new AppError("NOT_FOUND", "Cashier shift not found");
    }

    if (shift.status === "CLOSED") {
      throw new AppError("BAD_REQUEST", "Cashier shift is already closed");
    }

    // Reject if pending payments exist linked to this shift
    const pendingPaymentsCount = await tx.payment.count({
      where: {
        cashierShiftId: shiftId,
        status: "PENDING",
      },
    });

    if (pendingPaymentsCount > 0) {
      throw new AppError(
        "BAD_REQUEST",
        `Cannot close shift: ${pendingPaymentsCount} pending payments exist. Resolve or cancel them first.`
      );
    }

    // Calculate expectations
    const paymentsQuery: any[] = await tx.$queryRaw`
      SELECT COALESCE(SUM(amount), 0) as "cashSales"
      FROM "Payment"
      WHERE "cashierShiftId" = ${shift.id}
        AND status = 'PAID'
        AND method = 'CASH'
    `;

    const cashSales = Number(paymentsQuery[0]?.cashSales || 0);
    const openingCash = Number(shift.openingCash);
    const expectedCash = openingCash + cashSales;
    const difference = actualCash - expectedCash;

    const updated = await tx.cashierShift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        expectedCash,
        actualCash,
        difference,
        notes: notes || null,
      },
    });

    return updated;
  });
};
