import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main() {
  console.log("Seeding database users...");

  const defaultPassword = "test1234";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const usersToSeed = [
    {
      username: "admin",
      fullName: "System Admin",
      role: UserRole.ADMIN,
    },
    {
      username: "accounting",
      fullName: "Accounting Officer",
      role: UserRole.ACCOUNTING,
    },
    {
      username: "cashier",
      fullName: "Concession Cashier",
      role: UserRole.CASHIER,
    },
    {
      username: "kitchen",
      fullName: "Kitchen Staff",
      role: UserRole.KITCHEN,
    },
    {
      username: "warehouse",
      fullName: "Warehouse Officer",
      role: UserRole.WAREHOUSE,
    },
  ];

  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        passwordHash: passwordHash,
        role: u.role,
        isActive: true,
      },
      create: {
        username: u.username,
        fullName: u.fullName,
        passwordHash: passwordHash,
        role: u.role,
        isActive: true,
      },
    });
    console.log(`Seeded user: ${user.username} (${user.role})`);
  }

  console.log("User seeding completed successfully.");

  console.log("Cleaning up old concessions data...");
  await prisma.stockLedger.deleteMany({});
  await prisma.warehouseStock.deleteMany({});
  await prisma.promotionItem.deleteMany({});
  await prisma.promotion.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.table.deleteMany({});

  console.log("Seeding Concession Categories...");
  const categoriesToSeed = [
    { id: "e3d7b889-7cfc-4cc3-94c6-2007e0c4a45e", name: "Food" },
    { id: "d6bfa8a3-bb2b-42fa-b72e-d009b0b4a45f", name: "Drinks" },
    { id: "c5afc7c2-aa1b-41fa-a61e-c008a0b4a45e", name: "Combos" },
  ];

  for (const c of categoriesToSeed) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { name: c.name, isActive: true },
      create: { id: c.id, name: c.name, isActive: true },
    });
    console.log(`Seeded category: ${c.name}`);
  }

  console.log("Seeding Concession Products (Food, Drinks, Combos)...");
  
  const baseFoodList = [
    { name: "Caramel Popcorn Large", basePrice: 55000, sk: "FOOD-POPC-L", img: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&q=80&w=400" },
    { name: "Salty Popcorn Medium", basePrice: 45000, sk: "FOOD-POPC-M", img: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&q=80&w=400" },
    { name: "Hotdog Classic", basePrice: 38000, sk: "FOOD-HOTD-C", img: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&q=80&w=400" },
    { name: "French Fries", basePrice: 32000, sk: "FOOD-FRIE-R", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
    { name: "Cheese Popcorn Large", basePrice: 58000, sk: "FOOD-POPC-CHZ", img: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&q=80&w=400" },
    { name: "Butter Popcorn Medium", basePrice: 48000, sk: "FOOD-POPC-BUTR", img: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&q=80&w=400" },
    { name: "Spicy Chili Hotdog", basePrice: 42000, sk: "FOOD-HOTD-SPC", img: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&q=80&w=400" },
    { name: "Cheese Fries Large", basePrice: 38000, sk: "FOOD-FRIE-CHZ", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
    { name: "Sweet Popcorn Small", basePrice: 35000, sk: "FOOD-POPC-SM", img: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&q=80&w=400" },
    { name: "Jumbo Beef Hotdog", basePrice: 48000, sk: "FOOD-HOTD-JMB", img: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&q=80&w=400" },
    { name: "Onion Rings Basket", basePrice: 30000, sk: "FOOD-ONIO-B", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
    { name: "Chicken Nuggets Box", basePrice: 36000, sk: "FOOD-NUG-B", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
    { name: "Chocolate Popcorn Large", basePrice: 60000, sk: "FOOD-POPC-CHO", img: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&q=80&w=400" },
    { name: "Double Cheese Burger", basePrice: 52000, sk: "FOOD-BURG-DBL", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
    { name: "Spicy Chicken Burger", basePrice: 46000, sk: "FOOD-BURG-SPC", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
    { name: "Loaded Cheese Nachos", basePrice: 40000, sk: "FOOD-NACH-L", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
  ];

  const baseDrinkList = [
    { name: "Coca-Cola", basePrice: 25000, sk: "DRNK-COKE-R", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400" },
    { name: "Iced Sweet Tea", basePrice: 18000, sk: "DRNK-STEA-I", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400" },
    { name: "Mineral Water", basePrice: 12000, sk: "DRNK-WATR-M", img: "https://images.unsplash.com/photo-1608885898957-a599fb18e441?auto=format&fit=crop&q=80&w=400" },
    { name: "Sprite Soda", basePrice: 25000, sk: "DRNK-SPRT-R", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400" },
    { name: "Fanta Orange", basePrice: 25000, sk: "DRNK-FANT-R", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400" },
    { name: "Jasmine Green Tea", basePrice: 20000, sk: "DRNK-GTEA-J", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400" },
    { name: "Lemon Tea Iced", basePrice: 22000, sk: "DRNK-LTEA-I", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400" },
    { name: "Mango Juice", basePrice: 28000, sk: "DRNK-MNG-J", img: "https://images.unsplash.com/photo-1608885898957-a599fb18e441?auto=format&fit=crop&q=80&w=400" },
    { name: "Hot Americano", basePrice: 24000, sk: "DRNK-COF-AME", img: "https://images.unsplash.com/photo-1608885898957-a599fb18e441?auto=format&fit=crop&q=80&w=400" },
    { name: "Iced Cafe Latte", basePrice: 30000, sk: "DRNK-COF-LAT", img: "https://images.unsplash.com/photo-1608885898957-a599fb18e441?auto=format&fit=crop&q=80&w=400" },
    { name: "Peach Tea Iced", basePrice: 24000, sk: "DRNK-PTEA-I", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400" },
    { name: "Lychee Tea Iced", basePrice: 26000, sk: "DRNK-LYTEA-I", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400" },
    { name: "Avocado Smoothie", basePrice: 34000, sk: "DRNK-AVO-SM", img: "https://images.unsplash.com/photo-1608885898957-a599fb18e441?auto=format&fit=crop&q=80&w=400" },
    { name: "Chocolate Milkshake", basePrice: 32000, sk: "DRNK-CHO-MS", img: "https://images.unsplash.com/photo-1608885898957-a599fb18e441?auto=format&fit=crop&q=80&w=400" },
    { name: "Strawberry Shake", basePrice: 32000, sk: "DRNK-STR-MS", img: "https://images.unsplash.com/photo-1608885898957-a599fb18e441?auto=format&fit=crop&q=80&w=400" },
    { name: "Iced Milo Dinosaur", basePrice: 28000, sk: "DRNK-MILO-D", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400" },
  ];

  const baseComboList = [
    { name: "Popcorn & Cola Combo", basePrice: 70000, sk: "CMBO-POP-COKE", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400" },
    { name: "Burger & Fries Drink Combo", basePrice: 85000, sk: "CMBO-BURGER-COMBO", img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=400" },
    { name: "Couple Popcorn Double Drink Combo", basePrice: 110000, sk: "CMBO-COUPLE-COMBO", img: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=400" },
    { name: "Classic Hotdog & Soda Combo", basePrice: 58000, sk: "CMBO-HOTD-COKE", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400" },
    { name: "Solo Popcorn Soda Deal", basePrice: 62000, sk: "CMBO-SOLO-DEAL", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400" },
    { name: "Mega Popcorn Drink Feast", basePrice: 125000, sk: "CMBO-MEGA-FEAST", img: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=400" },
    { name: "Burger & Boba Lovers Pack", basePrice: 78000, sk: "CMBO-BRG-BOBA", img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=400" },
    { name: "Kids Popcorn Mini Drink Box", basePrice: 42000, sk: "CMBO-KIDS-BOX", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400" },
    { name: "Double Hotdog Dual Cola Pack", basePrice: 95000, sk: "CMBO-DBL-HOTD", img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=400" },
    { name: "Snack Platter Combo Party", basePrice: 135000, sk: "CMBO-PARTY-PLT", img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=400" },
    { name: "Churros Sweet Treat Cola Pack", basePrice: 48000, sk: "CMBO-CHUR-COKE", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400" },
    { name: "Nuggets & Curly Fries Drink Pack", basePrice: 66000, sk: "CMBO-NUG-FRIE", img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=400" },
    { name: "Super Saver Nachos Soda Combo", basePrice: 60000, sk: "CMBO-NACH-COKE", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400" },
    { name: "Ultimate Movie Buff Combo XL", basePrice: 175000, sk: "CMBO-ULT-BUFF", img: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=400" },
    { name: "Spicy Burger Loaded Fries Drink", basePrice: 92000, sk: "CMBO-SPC-BRG", img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=400" },
    { name: "Late Night Cravings Deal", basePrice: 72000, sk: "CMBO-LATE-NIGHT", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400" },
  ];

  const productsToSeed: any[] = [];
  
  baseFoodList.forEach((p, idx) => {
    productsToSeed.push({
      id: `a${idx.toString().padStart(7, "0")}-1111-1111-1111-111111111111`,
      categoryId: "e3d7b889-7cfc-4cc3-94c6-2007e0c4a45e",
      sku: p.sk,
      name: p.name,
      price: p.basePrice,
      imageUrl: p.img,
    });
  });

  baseDrinkList.forEach((p, idx) => {
    productsToSeed.push({
      id: `b${idx.toString().padStart(7, "0")}-2222-2222-2222-222222222222`,
      categoryId: "d6bfa8a3-bb2b-42fa-b72e-d009b0b4a45f",
      sku: p.sk,
      name: p.name,
      price: p.basePrice,
      imageUrl: p.img,
    });
  });

  baseComboList.forEach((p, idx) => {
    productsToSeed.push({
      id: `c${idx.toString().padStart(7, "0")}-3333-3333-3333-333333333333`,
      categoryId: "c5afc7c2-aa1b-41fa-a61e-c008a0b4a45e",
      sku: p.sk,
      name: p.name,
      price: p.basePrice,
      imageUrl: p.img,
    });
  });

  for (const p of productsToSeed) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        categoryId: p.categoryId,
        sku: p.sku,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        isActive: true,
      },
      create: {
        id: p.id,
        categoryId: p.categoryId,
        sku: p.sku,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        isActive: true,
      },
    });
    console.log(`Seeded product: ${p.name} (SKU: ${p.sku})`);
  }

  console.log("Seeding POS Table Locations...");
  const tablesToSeed = [
    { id: "d1111111-1111-1111-1111-111111111111", code: "T1", name: "Table 1" },
    { id: "d2222222-2222-2222-2222-222222222222", code: "T2", name: "Table 2" },
    { id: "d3333333-3333-3333-3333-333333333333", code: "T3", name: "Table 3" },
    { id: "d4444444-4444-4444-4444-444444444444", code: "T4", name: "Table 4" },
    { id: "d5555555-5555-5555-5555-555555555555", code: "T5", name: "Table 5" },
  ];

  for (const t of tablesToSeed) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: { code: t.code, name: t.name, isActive: true },
      create: { id: t.id, code: t.code, name: t.name, isActive: true },
    });
    console.log(`Seeded table: ${t.name} (Code: ${t.code})`);
  }

  console.log("Database concessions seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
