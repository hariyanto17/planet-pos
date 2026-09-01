import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole
} from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export async function resetUat() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing destructive UAT reset in production environment!");
    process.exit(1);
  }

  console.log("⚠️  Resetting UAT Data in Concession POS...");
  
  // Clean transaction data
  await prisma.payment.deleteMany();
  await prisma.orderTax.deleteMany();
  await prisma.orderPromotion.deleteMany();
  await prisma.orderTimeline.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cashierShift.deleteMany();
  console.log("✓ Concession transaction data cleaned successfully.");

  // Clean product and inventory data
  await prisma.stockLedger.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.sellableProduct.deleteMany();
  await prisma.promotionItem.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.category.deleteMany();
  console.log("✓ Product and inventory data cleaned successfully.");
}

export async function seedUat() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing UAT seed execution in production environment!");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  UAT Data Reset & Seeding                        ");
  console.log("==================================================");

  // Reset all transaction data to start with empty state
  await resetUat();

  // Seed UAT users
  console.log("\n📝 Creating UAT Users...");
  const passwordHash = await bcrypt.hash("Uat12345!", 10);

  const uatUsers = [
    {
      username: "uat_concessionadmin",
      fullName: "UAT Concession Administrator",
      role: UserRole.ADMIN,
    },
    {
      username: "uat_concessionkasir",
      fullName: "UAT Concession Kasir",
      role: UserRole.CASHIER,
    },
    {
      username: "uat_kitchen",
      fullName: "UAT Kitchen Cook",
      role: UserRole.KITCHEN,
    },
    {
      username: "uat_warehouse",
      fullName: "UAT Warehouse Officer",
      role: UserRole.WAREHOUSE,
    },
    {
      username: "uat_accounting",
      fullName: "UAT Accounting Officer",
      role: UserRole.ACCOUNTING,
    },
    {
      username: "uat_executive",
      fullName: "UAT Executive GM",
      role: UserRole.ADMIN,
    },
  ];

  for (const user of uatUsers) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { passwordHash, isActive: true },
      create: {
        username: user.username,
        fullName: user.fullName,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });
  }
  console.log(`✓ ${uatUsers.length} UAT users created/updated successfully.`);

  console.log("\n==================================================");
  console.log("  UAT Database seeded successfully!              ");
  console.log("==================================================");
  console.log("\n🔑 UAT Credentials:");
  console.log("   Password (all users): Uat12345!");
  console.log("\n📋 Available Users:");
  uatUsers.forEach(user => {
    console.log(`   - ${user.username} (${user.role})`);
  });
}

if (require.main === module) {
  const isReset = process.argv.includes("--reset");
  const action = isReset ? resetUat() : seedUat();

  action
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
