import { PrismaClient } from "@prisma/client";

export async function seedUnits(prisma: PrismaClient) {
  console.log("Seeding Units...");

  const unitsToSeed = [
    { symbol: "PCS", name: "Pieces" },
    { symbol: "BOX", name: "Box" },
    { symbol: "PACK", name: "Pack" },
    { symbol: "BOTTLE", name: "Bottle" },
    { symbol: "CAN", name: "Can" },
    { symbol: "GRAM", name: "Grams" },
    { symbol: "KG", name: "Kilograms" },
    { symbol: "ML", name: "Milliliters" },
    { symbol: "LITER", name: "Liters" },
  ];

  const seededUnits = [];
  for (const u of unitsToSeed) {
    const unit = await prisma.unit.upsert({
      where: { symbol: u.symbol },
      update: { name: u.name, isActive: true },
      create: { symbol: u.symbol, name: u.name, isActive: true },
    });
    seededUnits.push(unit);
  }

  console.log(`Seeded ${seededUnits.length} units successfully.`);
  return seededUnits;
}
