import { prisma } from "../../../utils/prisma";

export const validateGrossRevenue = async (startDate: Date, endDate: Date) => {
  const itemSumQuery: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(oi.subtotal), 0) as "itemSubtotal"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE o.status = 'COMPLETED'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
  `;

  const orderSumQuery: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(subtotal), 0) as "orderSubtotal"
    FROM "Order"
    WHERE status = 'COMPLETED'
      AND "businessDate" >= ${startDate}
      AND "businessDate" <= ${endDate}
  `;

  const itemSubtotal = Number(itemSumQuery[0]?.itemSubtotal || 0);
  const orderSubtotal = Number(orderSumQuery[0]?.orderSubtotal || 0);
  const difference = Math.abs(itemSubtotal - orderSubtotal);

  return {
    grossRevenueMatch: difference === 0,
    difference,
  };
};

export const validateNetRevenue = async (startDate: Date, endDate: Date) => {
  // Overpaid: sum of PAID payments > order.grandTotal
  const overpaidQuery: any[] = await prisma.$queryRaw`
    SELECT 
      o.id as "orderId",
      o."orderNumber",
      o."grandTotal",
      COALESCE(SUM(p.amount), 0) as "paidAmount"
    FROM "Order" o
    JOIN "Payment" p ON p."orderId" = o.id
    WHERE p.status = 'PAID'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
    GROUP BY o.id, o."orderNumber", o."grandTotal"
    HAVING SUM(p.amount) > o."grandTotal"
  `;

  // Underpaid: Completed orders where sum of PAID payments < order.grandTotal
  const underpaidQuery: any[] = await prisma.$queryRaw`
    SELECT 
      o.id as "orderId",
      o."orderNumber",
      o."grandTotal",
      COALESCE(SUM(p.amount), 0) as "paidAmount"
    FROM "Order" o
    LEFT JOIN "Payment" p ON p."orderId" = o.id AND p.status = 'PAID'
    WHERE o.status = 'COMPLETED'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
    GROUP BY o.id, o."orderNumber", o."grandTotal"
    HAVING COALESCE(SUM(p.amount), 0) < o."grandTotal"
  `;

  // Missing: Completed orders with no PAID payments
  const missingPaymentsQuery: any[] = await prisma.$queryRaw`
    SELECT o.id as "orderId", o."orderNumber", o."grandTotal"
    FROM "Order" o
    WHERE o.status = 'COMPLETED'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
      AND NOT EXISTS (
        SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
      )
  `;

  // Duplicate: multiple payments associated with the same order
  const duplicatePaymentsQuery: any[] = await prisma.$queryRaw`
    SELECT 
      o.id as "orderId",
      o."orderNumber",
      COUNT(p.id) as "paymentCount"
    FROM "Order" o
    JOIN "Payment" p ON p."orderId" = o.id
    WHERE o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
    GROUP BY o.id, o."orderNumber"
    HAVING COUNT(p.id) > 1
  `;

  return {
    overpaid: overpaidQuery.map(row => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      grandTotal: Number(row.grandTotal),
      paidAmount: Number(row.paidAmount),
    })),
    underpaid: underpaidQuery.map(row => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      grandTotal: Number(row.grandTotal),
      paidAmount: Number(row.paidAmount),
    })),
    missing: missingPaymentsQuery.map(row => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      grandTotal: Number(row.grandTotal),
    })),
    duplicates: duplicatePaymentsQuery.map(row => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      paymentCount: Number(row.paymentCount),
    })),
  };
};
