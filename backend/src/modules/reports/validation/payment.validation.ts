import { prisma } from "../../../utils/prisma";

export const auditPaymentsReport = async (startDate: Date, endDate: Date) => {
  // 1. Total Orders count
  const totalQuery: any[] = await prisma.$queryRaw`
    SELECT COUNT(id) as "total"
    FROM "Order"
    WHERE "businessDate" >= ${startDate}
      AND "businessDate" <= ${endDate}
      AND status IN ('PREPARING', 'READY', 'COMPLETED')
  `;

  // 2. Paid Orders (fully paid: sum of PAID payments >= grandTotal)
  const paidQuery: any[] = await prisma.$queryRaw`
    SELECT COUNT(o.id) as "total"
    FROM "Order" o
    WHERE o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
      AND o.status IN ('PREPARING', 'READY', 'COMPLETED')
      AND (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM "Payment" p
        WHERE p."orderId" = o.id AND p.status = 'PAID'
      ) >= o."grandTotal"
  `;

  // 3. Pending Orders (status in PREPARING, READY and exists PENDING payment)
  const pendingQuery: any[] = await prisma.$queryRaw`
    SELECT COUNT(o.id) as "total"
    FROM "Order" o
    WHERE o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
      AND o.status IN ('PREPARING', 'READY')
      AND EXISTS (
        SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PENDING'
      )
  `;

  // 4. Overpaid Orders (SUM of PAID payments > grandTotal)
  const overpaidQuery: any[] = await prisma.$queryRaw`
    SELECT COUNT(o.id) as "total"
    FROM "Order" o
    WHERE o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
      AND (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM "Payment" p
        WHERE p."orderId" = o.id AND p.status = 'PAID'
      ) > o."grandTotal"
  `;

  // 5. Underpaid Orders (COMPLETED order where sum of PAID payments < grandTotal)
  const underpaidQuery: any[] = await prisma.$queryRaw`
    SELECT COUNT(o.id) as "total"
    FROM "Order" o
    WHERE o."businessDate" >= ${startDate}
      AND o."businessDate" <= ${endDate}
      AND o.status = 'COMPLETED'
      AND (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM "Payment" p
        WHERE p."orderId" = o.id AND p.status = 'PAID'
      ) < o."grandTotal"
  `;

  return {
    totalOrders: Number(totalQuery[0]?.total || 0),
    paidOrders: Number(paidQuery[0]?.total || 0),
    pendingOrders: Number(pendingQuery[0]?.total || 0),
    overpaidOrders: Number(overpaidQuery[0]?.total || 0),
    underpaidOrders: Number(underpaidQuery[0]?.total || 0),
  };
};
