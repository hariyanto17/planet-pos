import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const newPrismaClient = () => {
  const connectionString = `${process.env.DATABASE_URL}`;

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};
export const prisma = newPrismaClient();
