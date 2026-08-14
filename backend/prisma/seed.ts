import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();
import { seedUsers } from "./seeds/users.seed";
import { seedUnits } from "./seeds/units.seed";
import { seedCanonical } from "./seeds/canonical.seed";

const newPrismaClient = () => {
  const connectionString = `${process.env.DATABASE_URL}`;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

const prisma = newPrismaClient();

async function main() {
  console.log("Starting seed...");
  await seedUsers(prisma);
  await seedUnits(prisma);
  await seedCanonical(prisma);
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
