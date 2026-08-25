import { prisma } from "../../utils/prisma";

export interface OperationalSummary {
  revenue: number;
  transactions: number;
  itemsSold: number;
  averageTransaction: number;
}

export interface AnalyticsTrendItem {
  date: string;
  revenue: number;
  transactions: number;
  itemsSold: number;
}

export interface AnalyticsResult {
  revenue: number;
  transactions: number;
  itemsSold: number;
  daily: AnalyticsTrendItem[];
}

export interface ActivityResult {
  id: string;
  source: "CONCESSION";
  type: "TRANSACTION";
  title: string;
  description: string;
  timestamp: string;
  status: string;
  amount: number;
  referenceId: string;
}

export interface TransactionItem {
  id: string;
  source: "CONCESSION";
  transactionNumber: string;
  status: string;
  amount: number;
  currency: "IDR";
  itemCount: number;
  timestamp: string;
  customerName: string | null;
  cashierName: string;
}

export interface TransactionsPaginationResult {
  transactions: TransactionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

export const getOperationalSummary = async (dateStr: string): Promise<OperationalSummary> => {
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setUTCHours(23, 59, 59, 999);

  const [orders, itemsAggr] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "COMPLETED",
        businessDate: { gte: start, lte: end },
      },
      select: {
        grandTotal: true,
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: "COMPLETED",
          businessDate: { gte: start, lte: end },
        },
      },
      _sum: {
        quantity: true,
      },
    }),
  ]);

  const transactions = orders.length;
  const revenue = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
  const itemsSold = itemsAggr._sum.quantity || 0;
  const averageTransaction = transactions > 0 ? revenue / transactions : 0;

  return {
    revenue,
    transactions,
    itemsSold,
    averageTransaction,
  };
};

export const getAnalyticsData = async (startDate: string, endDate: string): Promise<AnalyticsResult> => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      status: "COMPLETED",
      businessDate: { gte: start, lte: end },
    },
    select: {
      grandTotal: true,
      businessDate: true,
      items: {
        select: {
          quantity: true,
        },
      },
    },
  });

  let totalRevenue = 0;
  const totalTransactions = orders.length;
  let totalItemsSold = 0;

  const dailyMap: Record<string, { date: string; revenue: number; transactions: number; itemsSold: number }> = {};
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split("T")[0];
    dailyMap[dStr] = { date: dStr, revenue: 0, transactions: 0, itemsSold: 0 };
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  for (const o of orders) {
    const dStr = o.businessDate.toISOString().split("T")[0];
    const revenue = Number(o.grandTotal);
    const itemsSold = o.items.reduce((sum, item) => sum + item.quantity, 0);

    totalRevenue += revenue;
    totalItemsSold += itemsSold;

    if (dailyMap[dStr]) {
      dailyMap[dStr].revenue += revenue;
      dailyMap[dStr].transactions += 1;
      dailyMap[dStr].itemsSold += itemsSold;
    }
  }

  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    revenue: totalRevenue,
    transactions: totalTransactions,
    itemsSold: totalItemsSold,
    daily,
  };
};

export const getActivityList = async (): Promise<ActivityResult[]> => {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      cashier: { select: { fullName: true } },
    },
  });

  return orders.map((o) => ({
    id: `concession-${o.id}`,
    source: "CONCESSION",
    type: "TRANSACTION",
    title: o.status === "COMPLETED" ? "Concession sale completed" : "Concession order cancelled",
    description: `${o.displayNumber || o.orderNumber} • ${formatRupiah(Number(o.grandTotal))} by ${o.cashier?.fullName || "Self-Order"}`,
    timestamp: o.createdAt.toISOString(),
    status: o.status,
    amount: Number(o.grandTotal),
    referenceId: o.id,
  }));
};

export const getTransactionsList = async (filters: {
  page: number;
  limit: number;
  status?: string;
  date?: string;
  search?: string;
}): Promise<TransactionsPaginationResult> => {
  const { page, limit, status, date, search } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) {
    where.status = status;
  } else {
    where.status = { in: ["COMPLETED", "CANCELLED"] };
  }

  if (date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    where.businessDate = { gte: start, lte: end };
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { displayNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        cashier: { select: { fullName: true } },
        items: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const transactions = orders.map((o) => ({
    id: o.id,
    source: "CONCESSION" as const,
    transactionNumber: o.displayNumber || o.orderNumber,
    status: o.status,
    amount: Number(o.grandTotal),
    currency: "IDR" as const,
    itemCount: o.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
    timestamp: o.createdAt.toISOString(),
    customerName: o.customerName || null,
    cashierName: o.cashier?.fullName || "Self-Order",
  }));

  return {
    transactions,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};
