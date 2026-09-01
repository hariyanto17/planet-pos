import { PrismaPg } from "@prisma/adapter-pg";
import { 
  PrismaClient, 
  UserRole, 
  OrderStatus, 
  OrderSource, 
  OrderType, 
  PaymentMethod, 
  PaymentStatus, 
  CashierShiftStatus, 
  WarehouseType 
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
  console.log("  UAT Data Reset - Empty Seeding                  ");
  console.log("==================================================");

  // Reset all transaction data to start with empty state
  await resetUat();

  console.log("==================================================");
  console.log("  UAT Database is now empty and ready to use!     ");
  console.log("==================================================");
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
