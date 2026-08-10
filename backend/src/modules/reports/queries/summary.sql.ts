import { prisma } from "../../../utils/prisma";

export const querySummaryReport = async (startDate: Date, endDate: Date) => {
  // Query 1: Net Revenue (Sum of PAID payments for orders)
  const netRevenueQuery: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(p.amount), 0) as "netRevenue"
    FROM "Payment" p
    JOIN "Order" o ON p."orderId" = o.id
    WHERE p.status = 'PAID'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
  `;

  // Query 2: Gross Revenue (Sum of OrderItem.subtotal for orders with PAID payments)
  const grossRevenueQuery: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(oi.subtotal), 0) as "grossRevenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE EXISTS (
      SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
    )
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
  `;

  // Query 3: Order Counts and Discounts
  const orderCountsQuery: any[] = await prisma.$queryRaw`
    SELECT 
      COUNT(id) as "totalOrders",
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as "completedOrders",
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as "cancelledOrders",
      SUM(CASE WHEN "orderType" = 'DINE_IN' THEN 1 ELSE 0 END) as "dineIn",
      SUM(CASE WHEN "orderType" = 'TAKEAWAY' THEN 1 ELSE 0 END) as "takeaway",
      COALESCE(SUM("discountAmount"), 0) as "totalDiscount"
    FROM "Order"
    WHERE "businessDate" >= ${startDate}
      AND "businessDate" <= ${endDate}
  `;

  const netRevenue = Number(netRevenueQuery[0]?.netRevenue || 0);
  const grossRevenue = Number(grossRevenueQuery[0]?.grossRevenue || 0);
  
  const totalOrders = Number(orderCountsQuery[0]?.totalOrders || 0);
  const completedOrders = Number(orderCountsQuery[0]?.completedOrders || 0);
  const cancelledOrders = Number(orderCountsQuery[0]?.cancelledOrders || 0);
  const dineIn = Number(orderCountsQuery[0]?.dineIn || 0);
  const takeaway = Number(orderCountsQuery[0]?.takeaway || 0);
  const discount = Number(orderCountsQuery[0]?.totalDiscount || 0);

  const averageOrderValue = completedOrders > 0 ? Math.round(netRevenue / completedOrders) : 0;

  return {
    grossRevenue,
    netRevenue,
    discountTotal: discount,
    totalOrders,
    completedOrders,
    averageOrderValue,
  };
};

