import { PrismaClient } from "@prisma/client";
import { seedUnits } from "./seed/units.seed";

const prisma = new PrismaClient();

async function main() {
  await seedUnits(prisma);
  console.log("Units seeding successfully completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
