import { getAllOrdersPaginated } from "../../src/modules/orders/pagination.service";
import { getKitchenQueue } from "../../src/modules/orders/queue.service";
import { getPendingPayments } from "../../src/modules/orders/pendingPayment.service";
import { prisma } from "../../src/utils/prisma";
import process from "process";

async function runBenchmark() {
  console.log("=== STARTING ORDER QUERIES BENCHMARK ===");

  // 1. Pagination query
  console.log("\n1. Measuring Historical Orders pagination (Page 100, Limit 50)...");
  const startPaginated = performance.now();
  const paginatedResult = await getAllOrdersPaginated({ page: 100, limit: 50 });
  const endPaginated = performance.now();
  console.log(`- Execution time: ${(endPaginated - startPaginated).toFixed(2)} ms`);
  console.log(`- Returned rows in page: ${paginatedResult.data.length}`);
  console.log(`- Total matches count: ${paginatedResult.pagination.totalItems}`);

  // 2. Kitchen Queue
  console.log("\n2. Measuring Kitchen Queue (PREPARING & READY)...");
  const startQueue = performance.now();
  const queueResult = await getKitchenQueue();
  const endQueue = performance.now();
  console.log(`- Execution time: ${(endQueue - startQueue).toFixed(2)} ms`);
  console.log(`- Returned active kitchen rows: ${queueResult.length}`);

  // 3. Pending Payments
  console.log("\n3. Measuring Pending Cashier Payments (PENDING status)...");
  const startPending = performance.now();
  const pendingResult = await getPendingPayments();
  const endPending = performance.now();
  console.log(`- Execution time: ${(endPending - startPending).toFixed(2)} ms`);
  console.log(`- Returned pending collection rows: ${pendingResult.length}`);

  console.log("\n=== BENCHMARK COMPLETED SUCCESSFULLY ===");
}

runBenchmark()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
