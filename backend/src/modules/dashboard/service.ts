import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardStats = async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Order counts
  const todayOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const preparingOrders = await prisma.order.count({
    where: {
      status: "PREPARING",
    },
  });

  const readyOrders = await prisma.order.count({
    where: {
      status: "READY",
    },
  });

  const completedOrders = await prisma.order.count({
    where: {
      status: "COMPLETED",
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // 2. Revenue sums
  const paymentsToday = await prisma.payment.findMany({
    where: {
      status: "PAID",
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      amount: true,
      method: true,
    },
  });

  let todayRevenue = 0;
  let cashRevenue = 0;
  let qrisRevenue = 0;

  for (const p of paymentsToday) {
    const amt = Number(p.amount);
    todayRevenue += amt;
    if (p.method === "CASH") {
      cashRevenue += amt;
    } else if (p.method === "QRIS") {
      qrisRevenue += amt;
    }
  }

  // 3. Recent 10 orders
  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      table: true,
      payments: {
        select: {
          method: true,
          status: true,
        },
      },
    },
  });

  return {
    todayRevenue,
    todayOrders,
    preparingOrders,
    readyOrders,
    completedOrders,
    cashRevenue,
    qrisRevenue,
    recentOrders,
  };
};
