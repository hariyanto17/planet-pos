import { prisma } from "../../../utils/prisma";

export const queryReconciliationReport = async (startDate: Date, endDate: Date) => {
  const expectedQuery: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM("grandTotal"), 0) as "expectedRevenue"
    FROM "Order"
    WHERE "businessDate" >= ${startDate}
      AND "businessDate" <= ${endDate}
      AND status IN ('PREPARING', 'READY', 'COMPLETED')
  `;

  const collectedQuery: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(amount), 0) as "collectedRevenue"
    FROM "Payment" p
    JOIN "Order" o ON p."orderId" = o.id
    WHERE p.status = 'PAID'
      AND o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
  `;

  const unpaidQuery: any[] = await prisma.$queryRaw`
    SELECT 
      COUNT(o.id) as "count",
      COALESCE(SUM(o."grandTotal"), 0) as "amount"
    FROM "Order" o
    WHERE EXISTS (
      SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PENDING'
    )
    AND o."businessDate" >= ${startDate}
    AND o."businessDate" <= ${endDate}
  `;

  const expectedRevenue = Number(expectedQuery[0]?.expectedRevenue || 0);
  const collectedRevenue = Number(collectedQuery[0]?.collectedRevenue || 0);
  const outstandingAmount = Math.max(0, expectedRevenue - collectedRevenue);

  const unpaidOrderCount = Number(unpaidQuery[0]?.count || 0);
  const unpaidOrderValue = Number(unpaidQuery[0]?.amount || 0);

  return {
    expectedRevenue,
    collectedRevenue,
    outstandingAmount,
    unpaidOrderCount,
    unpaidOrderValue,
  };
};
export default queryReconciliationReport;
