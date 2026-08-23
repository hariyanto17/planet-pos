import { AppError } from "../../utils/errorHandler";
import { querySummaryReport } from "./queries/summary.sql";
import { querySalesReport } from "./queries/sales.sql";
import { queryPaymentReport } from "./queries/payments.sql";
import { queryReconciliationReport } from "./queries/reconciliation.sql";
import { queryProductSalesReport } from "./queries/products.sql";
import { auditPaymentsReport } from "./validation/payment.validation";
import { auditOrdersReport } from "./validation/order.validation";
import { prisma } from "../../utils/prisma";
import { getSettings } from "../settings/service";


const validateDateRange = (startDateStr: string, endDateStr: string) => {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new AppError("BAD_REQUEST", "Invalid date format");
  }

  if (startDate > endDate) {
    throw new AppError("BAD_REQUEST", "Start date cannot be after end date");
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > 365) {
    throw new AppError("BAD_REQUEST", "Report range cannot exceed 365 days");
  }

  const adjustedStart = new Date(startDate);
  adjustedStart.setHours(0, 0, 0, 0);

  const adjustedEnd = new Date(endDate);
  adjustedEnd.setHours(23, 59, 59, 999);

  return { startDate: adjustedStart, endDate: adjustedEnd };
};

const getMetaEnvelope = async (startDateStr: string, endDateStr: string, warning?: string) => {
  const settings = await getSettings();
  return {
    generatedAt: new Date().toISOString(),
    timezone: settings.timezone || "Asia/Makassar",
    range: {
      startDate: startDateStr,
      endDate: endDateStr,
    },
    currency: settings.currency || "IDR",
    ...(warning ? { warning } : {}),
  };
};

export const getSummaryReport = async (startDateStr: string, endDateStr: string) => {
  const { startDate, endDate } = validateDateRange(startDateStr, endDateStr);
  const summary = await querySummaryReport(startDate, endDate);
  const reconciliation = await queryReconciliationReport(startDate, endDate);
  
  let warning: string | undefined = undefined;
  if (reconciliation.collectedRevenue > reconciliation.expectedRevenue) {
    warning = "Collected revenue exceeds expected revenue. Please review payment records.";
  }

  // Shifts operational summary
  const shiftsCount = await prisma.cashierShift.count({
    where: {
      businessDate: { gte: startDate, lte: endDate },
    },
  });

  const openShiftsCount = await prisma.cashierShift.count({
    where: {
      businessDate: { gte: startDate, lte: endDate },
      status: "OPEN",
    },
  });

  const closedShiftsCount = await prisma.cashierShift.count({
    where: {
      businessDate: { gte: startDate, lte: endDate },
      status: "CLOSED",
    },
  });

  const cashDifferenceQuery = await prisma.cashierShift.aggregate({
    where: {
      businessDate: { gte: startDate, lte: endDate },
      status: "CLOSED",
    },
    _sum: {
      difference: true,
    },
  });

  const balancedShiftsCount = await prisma.cashierShift.count({
    where: {
      businessDate: { gte: startDate, lte: endDate },
      status: "CLOSED",
      difference: 0,
    },
  });

  const unbalancedShiftsCount = await prisma.cashierShift.count({
    where: {
      businessDate: { gte: startDate, lte: endDate },
      status: "CLOSED",
      NOT: { difference: 0 },
    },
  });

  return {
    data: {
      ...summary,
      shifts: {
        total: shiftsCount,
        open: openShiftsCount,
        closed: closedShiftsCount,
        difference: Number(cashDifferenceQuery._sum.difference || 0),
        balanced: balancedShiftsCount,
        unbalanced: unbalancedShiftsCount,
      },
    },
    meta: await getMetaEnvelope(startDateStr, endDateStr, warning),
  };
};

export const getSalesReport = async (startDateStr: string, endDateStr: string) => {
  const { startDate, endDate } = validateDateRange(startDateStr, endDateStr);
  const data = await querySalesReport(startDate, endDate);
  return {
    data,
    meta: await getMetaEnvelope(startDateStr, endDateStr),
  };
};

export const getPaymentReport = async (startDateStr: string, endDateStr: string) => {
  const { startDate, endDate } = validateDateRange(startDateStr, endDateStr);
  const data = await queryPaymentReport(startDate, endDate);
  return {
    data,
    meta: await getMetaEnvelope(startDateStr, endDateStr),
  };
};

export const getReconciliationReport = async (startDateStr: string, endDateStr: string) => {
  const { startDate, endDate } = validateDateRange(startDateStr, endDateStr);
  const data = await queryReconciliationReport(startDate, endDate);
  
  let warning: string | undefined = undefined;
  if (data.collectedRevenue > data.expectedRevenue) {
    warning = "Collected revenue exceeds expected revenue. Please review payment records.";
  }

  return {
    data,
    meta: await getMetaEnvelope(startDateStr, endDateStr, warning),
  };
};

export const getProductSalesReport = async (
  startDateStr: string,
  endDateStr: string,
  options: { page?: number; limit?: number; categoryId?: string }
) => {
  const { startDate, endDate } = validateDateRange(startDateStr, endDateStr);
  const result = await queryProductSalesReport({
    startDate,
    endDate,
    page: options.page,
    limit: options.limit,
    categoryId: options.categoryId,
  });

  return {
    data: result.data,
    pagination: result.pagination,
    meta: await getMetaEnvelope(startDateStr, endDateStr),
  };
};

export const getPaymentAudit = async (startDateStr: string, endDateStr: string) => {
  const { startDate, endDate } = validateDateRange(startDateStr, endDateStr);
  const data = await auditPaymentsReport(startDate, endDate);
  return {
    data,
    meta: await getMetaEnvelope(startDateStr, endDateStr),
  };
};

export const getOrderAudit = async (startDateStr: string, endDateStr: string) => {
  const { startDate, endDate } = validateDateRange(startDateStr, endDateStr);
  const data = await auditOrdersReport(startDate, endDate);
  return {
    data,
    meta: await getMetaEnvelope(startDateStr, endDateStr),
  };
};

export const getAccountingSnapshot = async (businessDateStr: string) => {
  const businessDate = new Date(businessDateStr);
  if (isNaN(businessDate.getTime())) {
    throw new AppError("BAD_REQUEST", "Invalid date format");
  }

  const start = new Date(businessDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(businessDate);
  end.setHours(23, 59, 59, 999);

  const ordersCountQuery = await prisma.order.count({
    where: {
      businessDate: {
        gte: start,
        lte: end,
      },
      status: { in: ['PREPARING', 'READY', 'COMPLETED'] },
    },
  });

  const grossQuery: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(oi.subtotal), 0) as "gross"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE o.status = 'COMPLETED'
      AND o."businessDate" >= ${start}
      AND o."businessDate" <= ${end}
  `;

  const paymentsQuery: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) as "paid",
      COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END), 0) as "pending",
      COALESCE(SUM(CASE WHEN p.status = 'PAID' AND p.method = 'CASH' THEN p.amount ELSE 0 END), 0) as "cash",
      COALESCE(SUM(CASE WHEN p.status = 'PAID' AND p.method = 'QRIS' THEN p.amount ELSE 0 END), 0) as "qris"
    FROM "Payment" p
    JOIN "Order" o ON p."orderId" = o.id
    WHERE o."businessDate" >= ${start}
      AND o."businessDate" <= ${end}
  `;

  return {
    data: {
      businessDate: businessDateStr,
      orders: ordersCountQuery,
      grossRevenue: Number(grossQuery[0]?.gross || 0),
      paidRevenue: Number(paymentsQuery[0]?.paid || 0),
      pendingRevenue: Number(paymentsQuery[0]?.pending || 0),
      cashRevenue: Number(paymentsQuery[0]?.cash || 0),
      qrisRevenue: Number(paymentsQuery[0]?.qris || 0),
      generatedAt: new Date().toISOString(),
    },
    meta: await getMetaEnvelope(businessDateStr, businessDateStr),
  };
};

export const getShiftsReport = async (filters: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  shiftStatus?: "OPEN" | "CLOSED";
  differenceStatus?: "ALL" | "BALANCED" | "DISCREPANCY";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) => {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (filters.startDate || filters.endDate) {
    const range: any = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      range.gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    whereClause.businessDate = range;
  }

  if (filters.cashierId) {
    whereClause.userId = filters.cashierId;
  }

  if (filters.shiftStatus) {
    whereClause.status = filters.shiftStatus;
  }

  if (filters.differenceStatus === "BALANCED") {
    whereClause.status = "CLOSED";
    whereClause.difference = 0;
  } else if (filters.differenceStatus === "DISCREPANCY") {
    whereClause.status = "CLOSED";
    whereClause.NOT = { difference: 0 };
  }

  const sortBy = filters.sortBy || "openedAt";
  const sortOrder = filters.sortOrder || "desc";

  const totalShifts = await prisma.cashierShift.count({
    where: whereClause,
  });

  const shifts = await prisma.cashierShift.findMany({
    where: whereClause,
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip,
    take: limit,
    include: {
      user: {
        select: {
          fullName: true,
        },
      },
    },
  });

  const shiftIds = shifts.map((s) => s.id);

  // Group payments by cashierShiftId and method to compute cashSales/qrisSales without N+1 queries
  const paymentAggregates = await prisma.payment.groupBy({
    by: ["cashierShiftId", "method"],
    where: {
      status: "PAID",
      cashierShiftId: { in: shiftIds },
    },
    _sum: {
      amount: true,
    },
  });

  const salesMap = new Map<string, { cashSales: number; qrisSales: number }>();
  paymentAggregates.forEach((agg) => {
    if (!agg.cashierShiftId) return;
    const existing = salesMap.get(agg.cashierShiftId) || { cashSales: 0, qrisSales: 0 };
    const amt = Number(agg._sum.amount || 0);
    if (agg.method === "CASH") {
      existing.cashSales = amt;
    } else if (agg.method === "QRIS") {
      existing.qrisSales = amt;
    }
    salesMap.set(agg.cashierShiftId, existing);
  });

  const data = shifts.map((s) => {
    const sales = salesMap.get(s.id) || { cashSales: 0, qrisSales: 0 };
    return {
      id: s.id,
      businessDate: s.businessDate.toISOString().split("T")[0],
      cashier: s.user.fullName,
      status: s.status,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt ? s.closedAt.toISOString() : null,
      openingCash: Number(s.openingCash),
      cashSales: sales.cashSales,
      qrisSales: sales.qrisSales,
      expectedCash: Number(s.expectedCash),
      actualCash: s.actualCash ? Number(s.actualCash) : null,
      difference: s.difference ? Number(s.difference) : null,
      notes: s.notes,
    };
  });

  return {
    data,
    pagination: {
      total: totalShifts,
      page,
      limit,
      totalPages: Math.ceil(totalShifts / limit),
    },
    meta: {
      generatedAt: new Date().toISOString(),
    },
  };
};

export const getCashiersList = async () => {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["CASHIER", "ADMIN"] },
    },
    select: {
      id: true,
      fullName: true,
    },
  });
  return users;
};

export const getCashierShiftReport = async (userId: string) => {
  const activeShift = await prisma.cashierShift.findFirst({
    where: { userId, status: "OPEN" },
  });

  if (!activeShift) {
    return { shift: null, transactions: [] };
  }

  // Get all paid payments confirmed in this shift, plus any pending payments created by this cashier during this shift
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { cashierShiftId: activeShift.id },
        {
          order: {
            cashierId: userId,
            createdAt: { gte: activeShift.openedAt },
          },
          status: "PENDING",
        },
      ],
    },
    include: {
      order: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let cashSales = 0;
  let qrisSales = 0;
  let totalTransactions = 0;

  payments.forEach((p) => {
    if (p.status === "PAID") {
      totalTransactions += 1;
      const amt = Number(p.amount);
      if (p.method === "CASH") {
        cashSales += amt;
      } else if (p.method === "QRIS") {
        qrisSales += amt;
      }
    }
  });

  const totalSales = cashSales + qrisSales;
  const expectedCash = Number(activeShift.openingCash) + cashSales;

  const transactions = payments.map((p) => ({
    orderId: p.order.id,
    orderNumber: p.order.orderNumber,
    displayNumber: p.order.displayNumber,
    createdAt: p.createdAt.toISOString(),
    paymentMethod: p.method,
    paymentStatus: p.status,
    orderStatus: p.order.status,
    total: Number(p.amount),
    paymentId: p.id,
  }));


  return {
    shift: {
      id: activeShift.id,
      openedAt: activeShift.openedAt.toISOString(),
      openingCash: Number(activeShift.openingCash),
      expectedCash,
      totalSales,
      cashSales,
      qrisSales,
      totalTransactions,
    },
    transactions,
  };
};

export const getDailyAnalysis = async (dateStr: string) => {
  const { startDate, endDate } = validateDateRange(dateStr, dateStr);
  const timezone = (await getSettings()).timezone || "Asia/Makassar";

  // 1. Summary (Filtered by o.businessDate instead of p.confirmedAt)
  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID",
      order: {
        businessDate: { gte: startDate, lte: endDate },
      },
    },
  });

  let totalSales = 0;
  let cashSales = 0;
  let qrisSales = 0;
  let totalTransactions = payments.length;

  payments.forEach((p) => {
    const amt = Number(p.amount);
    totalSales += amt;
    if (p.method === "CASH") {
      cashSales += amt;
    } else if (p.method === "QRIS") {
      qrisSales += amt;
    }
  });

  const averageTransactionValue = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;

  // 2. Hourly Sales (Grouped by p.confirmedAt timezone hour, but filtered by o.businessDate)
  const hourlyData: { hour: number; count: number; amount: number }[] = await prisma.$queryRaw`
    SELECT 
      EXTRACT(HOUR FROM p."confirmedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::int as hour,
      COUNT(p.id)::int as count,
      COALESCE(SUM(p.amount), 0)::float as amount
    FROM "Payment" p
    JOIN "Order" o ON p."orderId" = o.id
    WHERE p.status = 'PAID'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
    GROUP BY hour
    ORDER BY hour ASC
  `;

  const hourlySales = hourlyData.map((d) => ({
    hour: String(d.hour).padStart(2, "0"),
    transactionCount: d.count,
    salesAmount: d.amount,
  }));

  // 3. Product Sales
  const productSales: any[] = await prisma.$queryRaw`
    SELECT 
      oi."productName" as "productName",
      SUM(oi.quantity)::int as "quantity",
      SUM(oi.subtotal)::float as "revenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE EXISTS (
      SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
    )
    AND o."businessDate" >= ${startDate}
    AND o."businessDate" <= ${endDate}
    GROUP BY oi."productId", oi."productName"
    ORDER BY "quantity" DESC, "revenue" DESC
  `;

  const topProducts = productSales.map((p, idx) => ({
    ranking: idx + 1,
    product: p.productName,
    qty: p.quantity,
    revenue: p.revenue,
  }));

  const lowProducts = [...productSales]
    .sort((a, b) => a.quantity - b.quantity)
    .map((p) => ({
      product: p.productName,
      qty: p.quantity,
      revenue: p.revenue,
    }));

  // 4. Category Sales
  const categorySales: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(oi."productCategory", 'Uncategorized') as "category",
      SUM(oi.quantity)::int as "quantity",
      SUM(oi.subtotal)::float as "revenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE EXISTS (
      SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
    )
    AND o."businessDate" >= ${startDate}
    AND o."businessDate" <= ${endDate}
    GROUP BY oi."productCategory"
    ORDER BY "revenue" DESC
  `;

  return {
    summary: {
      totalSales,
      totalTransactions,
      averageTransactionValue,
      cashSales,
      qrisSales,
    },
    hourlySales,
    topProducts,
    lowProducts,
    categorySales,
  };
};

export const getMonthlyAnalysis = async (month: number, year: number) => {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const timezone = (await getSettings()).timezone || "Asia/Makassar";

  // 1. Summary (Filtered by o.businessDate instead of p.confirmedAt)
  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID",
      order: {
        businessDate: { gte: startDate, lte: endDate },
      },
    },
  });

  let totalSales = 0;
  let cashSales = 0;
  let qrisSales = 0;
  let totalTransactions = payments.length;

  payments.forEach((p) => {
    const amt = Number(p.amount);
    totalSales += amt;
    if (p.method === "CASH") {
      cashSales += amt;
    } else if (p.method === "QRIS") {
      qrisSales += amt;
    }
  });

  const averageTransactionValue = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;

  // 2. Daily Sales Trend (Grouped and filtered by o.businessDate)
  const dailyTrendData: any[] = await prisma.$queryRaw`
    SELECT 
      TO_CHAR(o."businessDate" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}, 'YYYY-MM-DD') as "date",
      COUNT(p.id)::int as "count",
      COALESCE(SUM(p.amount), 0)::float as "amount"
    FROM "Payment" p
    JOIN "Order" o ON p."orderId" = o.id
    WHERE p.status = 'PAID'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
    GROUP BY "date"
    ORDER BY "date" ASC
  `;

  const dailySalesTrend = dailyTrendData.map((d) => ({
    date: d.date,
    transactionCount: d.count,
    salesAmount: d.amount,
  }));

  // 3. Top Products
  const productSales: any[] = await prisma.$queryRaw`
    SELECT 
      oi."productName" as "productName",
      SUM(oi.quantity)::int as "quantity",
      SUM(oi.subtotal)::float as "revenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE EXISTS (
      SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
    )
    AND o."businessDate" >= ${startDate}
    AND o."businessDate" <= ${endDate}
    GROUP BY oi."productId", oi."productName"
    ORDER BY "quantity" DESC, "revenue" DESC
  `;

  const topProducts = productSales.map((p, idx) => ({
    ranking: idx + 1,
    product: p.productName,
    qty: p.quantity,
    revenue: p.revenue,
  }));

  // 4. Category Performance
  const categorySales: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(oi."productCategory", 'Uncategorized') as "category",
      SUM(oi.quantity)::int as "quantity",
      SUM(oi.subtotal)::float as "revenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE EXISTS (
      SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
    )
    AND o."businessDate" >= ${startDate}
    AND o."businessDate" <= ${endDate}
    GROUP BY oi."productCategory"
    ORDER BY "revenue" DESC
  `;

  return {
    businessPeriod: {
      startStr: startDate.toISOString().split("T")[0],
      endStr: endDate.toISOString().split("T")[0],
    },
    summary: {
      totalSales,
      totalTransactions,
      averageTransactionValue,
      cashSales,
      qrisSales,
    },
    dailySalesTrend,
    topProducts,
    categorySales,
  };
};
