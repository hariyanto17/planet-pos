import { getSummaryReport, getPaymentReport, getReconciliationReport, getProductSalesReport } from "../../src/modules/reports/service";
import { prisma } from "../../src/utils/prisma";
import process from "process";

async function runReportsBenchmark() {
  console.log("=== STARTING REPORTS PRODUCTION BENCHMARK ===");

  const today = new Date();
  const startDateStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30).toISOString().split("T")[0]; // last 30 days
  const endDateStr = today.toISOString().split("T")[0];

  console.log(`Analyzing date range: ${startDateStr} to ${endDateStr}\n`);

  // 1. Summary Report
  const t0 = performance.now();
  const summary = await getSummaryReport(startDateStr, endDateStr);
  const t1 = performance.now();
  console.log(`1. Summary Report:`);
  console.log(`- Time: ${(t1 - t0).toFixed(2)} ms`);
  console.log(`- Gross: ${summary.data.grossRevenue}`);
  console.log(`- Net: ${summary.data.netRevenue}`);
  console.log(`- AOV: ${summary.data.averageOrderValue}`);

  // 2. Payment Report
  const t2 = performance.now();
  const paymentReport = await getPaymentReport(startDateStr, endDateStr);
  const t3 = performance.now();
  console.log(`\n2. Payment Report:`);
  console.log(`- Time: ${(t3 - t2).toFixed(2)} ms`);
  console.log(`- Cash Paid: ${paymentReport.data.cash.paid} (Pending: ${paymentReport.data.cash.pending})`);
  console.log(`- QRIS Paid: ${paymentReport.data.qris.paid} (Pending: ${paymentReport.data.qris.pending})`);
  console.log(`- Cancelled: ${paymentReport.data.cancelled}`);

  // 3. Reconciliation Report
  const t4 = performance.now();
  const reconciliation = await getReconciliationReport(startDateStr, endDateStr);
  const t5 = performance.now();
  console.log(`\n3. Reconciliation Report:`);
  console.log(`- Time: ${(t5 - t4).toFixed(2)} ms`);
  console.log(`- Expected: ${reconciliation.data.expectedRevenue}`);
  console.log(`- Collected: ${reconciliation.data.collectedRevenue}`);
  console.log(`- Outstanding: ${reconciliation.data.outstandingAmount}`);
  console.log(`- Unpaid Orders: ${reconciliation.data.unpaidOrderCount} (Value: ${reconciliation.data.unpaidOrderValue})`);

  // 4. Products Ranking Report
  const t6 = performance.now();
  const products = await getProductSalesReport(startDateStr, endDateStr, { page: 1, limit: 10 });
  const t7 = performance.now();
  console.log(`\n4. Product Ranking Report:`);
  console.log(`- Time: ${(t7 - t6).toFixed(2)} ms`);
  console.log(`- Returned items in page: ${products.data.length}`);
  console.log(`- Total unique products sold: ${products.pagination.totalItems}`);

  // 5. Raw SQL EXPLAIN ANALYZE for Summary Gross Revenue
  console.log("\n5. Running SQL EXPLAIN ANALYZE for Gross Revenue Query...");
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  const explainPlan: any[] = await prisma.$queryRawUnsafe(`
    EXPLAIN ANALYZE
    SELECT 
      COALESCE(SUM(oi.subtotal), 0) as "grossRevenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE o.status = 'COMPLETED'
      AND o."businessDate" >= $1
      AND o."businessDate" <= $2
  `, start, end);

  console.log("PostgreSQL EXPLAIN ANALYZE Result Plan:");
  explainPlan.forEach((row: any) => {
    console.log(row["QUERY PLAN"]);
  });

  console.log("\n=== REPORTS BENCHMARK COMPLETED ===");
}

runReportsBenchmark()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
