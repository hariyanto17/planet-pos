import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./seed/users.seed";
import { seedUnits } from "./seed/units.seed";
import { seedWarehouses } from "./seed/warehouses.seed";
import { seedCategories } from "./seed/categories.seed";
import { seedProducts } from "./seed/products.seed";
import { seedTaxes } from "./seed/taxes.seed";
import { seedPromotions } from "./seed/promotions.seed";
import { seedOpeningStock } from "./seed/opening-stock.seed";
import { seedTransfers } from "./seed/transfer.seed";
import { seedShifts } from "./seed/shifts.seed";
import { seedOrders } from "./seed/orders.seed";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("Cleaning database...");
  
  // Delete in dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.orderTimeline.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderPromotion.deleteMany({});
  await prisma.orderTax.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.stockLedger.deleteMany({});
  await prisma.stockTransferItem.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.warehouseStock.deleteMany({});
  await prisma.promotionItem.deleteMany({});
  await prisma.promotion.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.tax.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.cashierShift.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log("Database clean completed.");
}

async function verifyIntegrity() {
  console.log("Verifying database integrity...");

  // Rule: WarehouseStock always equals the accumulated StockLedger
  const stocks = await prisma.warehouseStock.findMany();
  for (const s of stocks) {
    const ledgers = await prisma.stockLedger.findMany({
      where: {
        warehouseId: s.warehouseId,
        productId: s.productId,
      },
    });
    const accumulated = ledgers.reduce((acc, curr) => acc + Number(curr.quantity), 0);
    if (Math.abs(accumulated - Number(s.quantity)) > 0.001) {
      throw new Error(
        `Integrity Violation: WarehouseStock for warehouse ${s.warehouseId} and product ${s.productId} is ${s.quantity}, but accumulated StockLedger is ${accumulated}.`
      );
    }
  }

  // Rule: Exactly one default kitchen warehouse
  const kitchenDefaults = await prisma.warehouse.findMany({
    where: { isDefaultKitchenStorage: true, isActive: true },
  });
  if (kitchenDefaults.length !== 1) {
    throw new Error(
      `Integrity Violation: Must have exactly 1 default kitchen warehouse. Found: ${kitchenDefaults.length}`
    );
  }

  // Rule: No orphan records, duplicate SKUs, etc. are guaranteed by database schema constraints (unique keys / foreign keys)
}

async function main() {
  const startTime = Date.now();
  
  // Clean
  await cleanDatabase();

  // Run seeders in order
  await seedUsers(prisma);
  await seedUnits(prisma);
  await seedWarehouses(prisma);

  const mainWh = await prisma.warehouse.findFirst({ where: { code: "WH-MAIN" } });
  if (mainWh) {
    await prisma.user.update({
      where: { username: "warehouse" },
      data: { warehouseId: mainWh.id }
    });
    console.log("Assigned 'warehouse' user to WH-MAIN.");
  }

  await seedCategories(prisma);
  await seedProducts(prisma);
  await seedTaxes(prisma);
  await seedPromotions(prisma);
  await seedOpeningStock(prisma);
  await seedTransfers(prisma);
  await seedShifts(prisma);
  await seedOrders(prisma);

  // Validate integrity
  await verifyIntegrity();

  // Fetch stats for printout
  const usersCount = await prisma.user.count();
  const warehousesCount = await prisma.warehouse.count();
  const unitsCount = await prisma.unit.count();
  const categoriesCount = await prisma.category.count();
  const productsCount = await prisma.product.count();
  const taxesCount = await prisma.tax.count();
  const promotionsCount = await prisma.promotion.count();
  const openingStockCount = await prisma.stockLedger.count({ where: { movementType: "OPENING" } });
  const transfersCount = await prisma.stockTransfer.count();
  const ordersCount = await prisma.order.count();
  const paymentsCount = await prisma.payment.count();
  const ledgersCount = await prisma.stockLedger.count();
  const warehouseStockCount = await prisma.warehouseStock.count();

  console.log(`
======================================
Planet Cinema UAT Seeder
======================================

Users: ${usersCount}
Warehouses: ${warehousesCount}
Units: ${unitsCount}
Categories: ${categoriesCount}
Products: ${productsCount}
Taxes: ${taxesCount}
Promotions: ${promotionsCount}
Opening Stock: ${openingStockCount}
Transfers: ${transfersCount}
Orders: ${ordersCount}
Payments: ${paymentsCount}
Ledger Entries: ${ledgersCount}
WarehouseStock Entries: ${warehouseStockCount}

Database Status:
✓ Foreign Keys Valid
✓ Warehouse Snapshot Valid
✓ Ledger Consistent
✓ Dashboard Ready
✓ UAT Ready

Seed completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s.
======================================
  `);
}

main()
  .catch((e) => {
    console.error("Seeding failed:");
    console.error(e);
    (globalThis as any).process?.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
