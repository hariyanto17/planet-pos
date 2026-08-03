import { PrismaClient, CashierShiftStatus } from "@prisma/client";

export async function seedShifts(prisma: PrismaClient) {
  console.log("Seeding Cashier Shifts...");

  const cashier1 = await prisma.user.findUnique({ where: { username: "cashier1" } });
  const cashier2 = await prisma.user.findUnique({ where: { username: "cashier2" } });

  if (!cashier1 || !cashier2) {
    throw new Error("Cashier users not found for shifts seeding.");
  }

  // 1. Closed shift for cashier2
  const shiftClosedId = "shift-c2-closed-0000000-0000-0000-0000-000000000002";
  const closedShift = await prisma.cashierShift.upsert({
    where: { id: shiftClosedId },
    update: {
      userId: cashier2.id,
      status: CashierShiftStatus.CLOSED,
      openingCash: 100000.00,
      expectedCash: 350000.00,
      actualCash: 350000.00,
      difference: 0.00,
      openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      closedAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
      notes: "Shift ended normally, cash matches expected amount.",
    },
    create: {
      id: shiftClosedId,
      userId: cashier2.id,
      status: CashierShiftStatus.CLOSED,
      openingCash: 100000.00,
      expectedCash: 350000.00,
      actualCash: 350000.00,
      difference: 0.00,
      openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
      notes: "Shift ended normally, cash matches expected amount.",
    },
  });

  // 2. Active open shift for cashier1
  const shiftOpenId = "shift-c1-open-00000000-0000-0000-0000-000000000001";
  const openShift = await prisma.cashierShift.upsert({
    where: { id: shiftOpenId },
    update: {
      userId: cashier1.id,
      status: CashierShiftStatus.OPEN,
      openingCash: 100000.00,
      expectedCash: 100000.00,
      actualCash: null,
      difference: null,
      openedAt: new Date(),
      closedAt: null,
      notes: "Active morning shift.",
    },
    create: {
      id: shiftOpenId,
      userId: cashier1.id,
      status: CashierShiftStatus.OPEN,
      openingCash: 100000.00,
      expectedCash: 100000.00,
      actualCash: null,
      difference: null,
      openedAt: new Date(),
      closedAt: null,
      notes: "Active morning shift.",
    },
  });

  console.log("Seeded closed and open cashier shifts successfully.");
  return { openShift, closedShift };
}
