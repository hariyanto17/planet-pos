import { prisma } from "../../../utils/prisma";

export const querySalesReport = async (startDate: Date, endDate: Date) => {
  const result: any[] = await prisma.$queryRaw`
    SELECT 
      TO_CHAR(o."businessDate", 'YYYY-MM-DD') as "date",
      COUNT(DISTINCT o.id) as "orders",
      COALESCE(SUM(p.amount), 0) as "revenue"
    FROM "Order" o
    LEFT JOIN "Payment" p ON p."orderId" = o.id AND p.status = 'PAID'
    WHERE o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
      AND o.status = 'COMPLETED'
    GROUP BY TO_CHAR(o."businessDate", 'YYYY-MM-DD')
    ORDER BY "date" ASC
  `;

  return result.map((row) => ({
    date: row.date,
    orders: Number(row.orders),
    revenue: Number(row.revenue),
  }));
};
export default querySalesReport;
