import { prisma } from "../../../utils/prisma";

export const auditOrdersReport = async (startDate: Date, endDate: Date) => {
  // Threshold: 2 hours ago
  const thresholdTime = new Date();
  thresholdTime.setHours(thresholdTime.getHours() - 2);

  // 1. Invalid Completed Orders: COMPLETED order without any PAID payment
  const invalidCompletedQuery: any[] = await prisma.$queryRaw`
    SELECT 
      o.id as "orderId",
      o."orderNumber",
      o."grandTotal",
      TO_CHAR(o."businessDate", 'YYYY-MM-DD') as "businessDate"
    FROM "Order" o
    WHERE o.status = 'COMPLETED'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
      AND NOT EXISTS (
        SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
      )
  `;

  // 2. Stuck Preparing Orders: status = PREPARING and createdAt < 2 hours ago
  const stuckPreparingQuery: any[] = await prisma.$queryRaw`
    SELECT 
      o.id as "orderId",
      o."orderNumber",
      o."grandTotal",
      o.status,
      o."createdAt"
    FROM "Order" o
    WHERE o.status = 'PREPARING'
      AND o."createdAt" < ${thresholdTime}
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
  `;

  // 3. Stuck Ready Orders: status = READY and createdAt < 2 hours ago
  const stuckReadyQuery: any[] = await prisma.$queryRaw`
    SELECT 
      o.id as "orderId",
      o."orderNumber",
      o."grandTotal",
      o.status,
      o."createdAt"
    FROM "Order" o
    WHERE o.status = 'READY'
      AND o."createdAt" < ${thresholdTime}
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
  `;

  return {
    invalidCompletedOrders: invalidCompletedQuery.map(row => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      grandTotal: Number(row.grandTotal),
      businessDate: row.businessDate,
    })),
    stuckPreparingOrders: stuckPreparingQuery.map(row => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      grandTotal: Number(row.grandTotal),
      createdAt: row.createdAt,
    })),
    stuckReadyOrders: stuckReadyQuery.map(row => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      grandTotal: Number(row.grandTotal),
      createdAt: row.createdAt,
    })),
  };
};
