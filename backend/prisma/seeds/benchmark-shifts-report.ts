import { PrismaClient } from "@prisma/client";
import { getShiftsReport, getSummaryReport } from "../../src/modules/reports/service";

const prisma = new PrismaClient();

async function runBenchmark() {
  console.log("=== STARTING OPERATIONAL SHIFTS REPORTS BENCHMARK ===");

  // Count shifts present
  const count = await prisma.cashierShift.count();
  console.log(`Current cashier shifts count in DB: ${count}`);

  if (count === 0) {
    console.log("Seeding temporary mock shifts and payments for benchmarking...");
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("No user found. Please run baseline seed first.");
      process.exit(0);
    }

    // Seed 100 cashier shifts and payments
    const today = new Date();
    await prisma.cashierShift.createMany({
      data: Array.from({ length: 100 }).map((_, i) => {
        const openedAt = new Date(today);
        openedAt.setDate(today.getDate() - i);
        return {
          userId: user.id,
          businessDate: openedAt,
          openedAt,
          closedAt: openedAt,
          status: "CLOSED",
          openingCash: 500000,
          expectedCash: 1200000,
          actualCash: 1200000,
          difference: 0,
          notes: "Auto seeded shift for benchmarking",
        };
      }),
    });
    console.log("Seeded 100 mock shifts successfully.");
  }

  // Define date range filters
  const today = new Date();
  const startStr = new Date(today.setDate(today.getDate() - 30)).toISOString().split("T")[0];
  const endStr = new Date().toISOString().split("T")[0];

  console.log(`Running benchmark on date range: ${startStr} to ${endStr}`);

  // Test 1: getShiftsReport latency
  const t0 = performance.now();
  const result = await getShiftsReport({
    startDate: startStr,
    endDate: endStr,
    page: 1,
    limit: 10,
    sortBy: "openedAt",
    sortOrder: "desc",
  });
  const t1 = performance.now();
  console.log(`getShiftsReport timing: ${(t1 - t0).toFixed(2)} ms (Shifts count: ${result.data.length})`);

  // Test 2: getSummaryReport latency (which now aggregates shifts operational metrics)
  const t2 = performance.now();
  const summary = await getSummaryReport(startStr, endStr);
  const t3 = performance.now();
  console.log(`getSummaryReport (with shifts metrics) timing: ${(t3 - t2).toFixed(2)} ms`);
  console.log("Aggregated shifts summary metrics:", summary.data.shifts);

  console.log("=== SHIFTS REPORTS BENCHMARK COMPLETED ===");
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error("Benchmark error:", err);
  process.exit(1);
});
