import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./seeds/users.seed";
import { seedUnits } from "./seeds/units.seed";
import { seedInventory } from "./seeds/inventory.seed";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");
  await seedUsers(prisma);
  await seedUnits(prisma);
  await seedInventory(prisma);
  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
