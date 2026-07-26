import { prisma } from "../../../utils/prisma";

export const queryPaymentReport = async (startDate: Date, endDate: Date) => {
  const result: any[] = await prisma.$queryRaw`
    SELECT 
      method,
      status,
      COALESCE(SUM(amount), 0) as "totalAmount"
    FROM "Payment"
    WHERE "createdAt" >= ${startDate}
      AND "createdAt" <= ${endDate}
    GROUP BY method, status
  `;

  const report = {
    cash: { paid: 0, pending: 0 },
    qris: { paid: 0, pending: 0 },
    cancelled: 0,
  };

  result.forEach((row) => {
    const method = row.method;
    const status = row.status;
    const amount = Number(row.totalAmount);

    if (status === "CANCELLED") {
      report.cancelled += amount;
    } else if (method === "CASH") {
      if (status === "PAID") report.cash.paid = amount;
      else if (status === "PENDING") report.cash.pending = amount;
    } else if (method === "QRIS") {
      if (status === "PAID") report.qris.paid = amount;
      else if (status === "PENDING") report.qris.pending = amount;
    }
  });

  return report;
};
export default queryPaymentReport;
