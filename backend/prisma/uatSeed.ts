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
  await prisma.payment.deleteMany();
  await prisma.orderTax.deleteMany();
  await prisma.orderPromotion.deleteMany();
  await prisma.orderTimeline.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cashierShift.deleteMany();
  console.log("✓ Concession transaction data cleaned successfully.");
}

export async function seedUat() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing UAT seed execution in production environment!");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  Seeding Concession POS for Local UAT            ");
  console.log("==================================================");

  // 1. Ensure Warehouses & Settings
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_MAIN" },
    update: { name: "Main Sales Counter", warehouseType: WarehouseType.SALES, isActive: true },
    create: { code: "WH_MAIN", name: "Main Sales Counter", warehouseType: WarehouseType.SALES, isActive: true },
  });

  const kitchenWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_KITCHEN" },
    update: { name: "Kitchen Storage", warehouseType: WarehouseType.KITCHEN_STORAGE, isActive: true, isDefaultKitchenStorage: true },
    create: { code: "WH_KITCHEN", name: "Kitchen Storage", warehouseType: WarehouseType.KITCHEN_STORAGE, isActive: true, isDefaultKitchenStorage: true },
  });

  await prisma.appSettings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      appName: "Planet Cinema Concession",
      appType: "SELF_ORDER",
      timezone: "Asia/Makassar",
      locale: "id-ID",
      currency: "IDR",
      businessDayStartTime: "00:00",
      defaultWarehouseId: mainWarehouse.id,
      kitchenWarehouseId: kitchenWarehouse.id,
    },
  });
  console.log("✓ Warehouses & AppSettings verified");

  // 2. UAT Users
  const passwordHash = await bcrypt.hash("test1234", 10);
  const usersDef = [
    { username: "uat_admin", fullName: "UAT Platform Administrator", role: UserRole.ADMIN },
    { username: "uat_kasir", fullName: "UAT Kasir Counter", role: UserRole.CASHIER },
    { username: "uat_concessionadmin", fullName: "UAT Concession Administrator", role: UserRole.ADMIN },
    { username: "uat_concessionkasir", fullName: "UAT Concession Kasir", role: UserRole.CASHIER },
    { username: "uat_accounting", fullName: "UAT Accounting Officer", role: UserRole.ACCOUNTING },
    { username: "uat_warehouse", fullName: "UAT Warehouse Officer", role: UserRole.WAREHOUSE },
    { username: "uat_kitchen", fullName: "UAT Kitchen Cook", role: UserRole.KITCHEN },
    { username: "uat_executive", fullName: "UAT Executive GM", role: UserRole.ADMIN },
  ];

  const usersMap: Record<string, any> = {};
  for (const u of usersDef) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName, role: u.role, passwordHash, isActive: true },
      create: {
        username: u.username,
        fullName: u.fullName,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    });
    usersMap[u.username] = user;
  }
  const cashierUser = usersMap["uat_kasir"];
  console.log("✓ Concession UAT Users verified");

  // 3. Categories
  const categoriesDef = [
    { name: "Popcorn & Snacks" },
    { name: "Hot Food" },
    { name: "Beverages" },
    { name: "Combo Packages" },
  ];

  const categoriesMap: Record<string, any> = {};
  for (const cDef of categoriesDef) {
    let cat = await prisma.category.findFirst({ where: { name: cDef.name } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name: cDef.name, isActive: true } });
    }
    categoriesMap[cDef.name] = cat;
  }
  console.log("✓ Categories verified");

  // 4. Products (Sellable Products)
  const productsDef = [
    { name: "Large Caramel Popcorn", sku: "POP-CAR-LG", category: "Popcorn & Snacks", price: 50000 },
    { name: "Regular Salty Popcorn", sku: "POP-SLT-RG", category: "Popcorn & Snacks", price: 35000 },
    { name: "Cheesy Nachos Supreme", sku: "SNK-NCH-SP", category: "Popcorn & Snacks", price: 45000 },
    { name: "Crispy French Fries", sku: "SNK-FF-CR", category: "Hot Food", price: 30000 },
    { name: "Jumbo Hot Dog", sku: "HOT-JMB-DG", category: "Hot Food", price: 40000 },
    { name: "Coca-Cola Large", sku: "BEV-COKE-LG", category: "Beverages", price: 25000 },
    { name: "Mineral Water 600ml", sku: "BEV-WAT-600", category: "Beverages", price: 15000 },
    { name: "Iced Caffe Latte", sku: "BEV-LATTE-IC", category: "Beverages", price: 35000 },
    { name: "Combo Couple Box", sku: "CMB-CPL-BX", category: "Combo Packages", price: 90000 },
  ];

  const productsMap: Record<string, any> = {};
  for (const pDef of productsDef) {
    const cat = categoriesMap[pDef.category];
    const product = await prisma.sellableProduct.upsert({
      where: { sku: pDef.sku },
      update: {
        name: pDef.name,
        price: pDef.price,
        categoryId: cat.id,
        isActive: true,
      },
      create: {
        name: pDef.name,
        sku: pDef.sku,
        price: pDef.price,
        categoryId: cat.id,
        isActive: true,
      },
    });
    productsMap[pDef.sku] = product;
  }
  console.log("✓ Sellable Products Seeded (Popcorn, Fries, Nachos, Hot Dog, Drinks, Combo)");

  // 5. Historical & Current Orders & Cashier Shifts
  const targetDays = [0, 1, 2, 3, 5, 7]; // Days ago
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  let totalOrdersCreated = 0;
  let totalItemsCreated = 0;

  for (const daysAgo of targetDays) {
    const orderDate = new Date(baseDate.getTime() - daysAgo * 24 * 3600 * 1000);
    const dateStr = orderDate.toISOString().split("T")[0];

    // Create a Cashier Shift for each business day
    let shift = await prisma.cashierShift.findFirst({
      where: {
        userId: cashierUser.id,
        businessDate: orderDate,
      },
    });

    const shiftOpenTime = new Date(orderDate.getTime() + 10 * 3600 * 1000); // 10:00 AM
    const shiftCloseTime = new Date(orderDate.getTime() + 22 * 3600 * 1000); // 22:00 PM

    if (!shift) {
      shift = await prisma.cashierShift.create({
        data: {
          userId: cashierUser.id,
          businessDate: orderDate,
          status: daysAgo === 0 ? CashierShiftStatus.OPEN : CashierShiftStatus.CLOSED,
          openedAt: shiftOpenTime,
          closedAt: daysAgo === 0 ? null : shiftCloseTime,
          openingCash: 500000,
          expectedCash: 3500000,
          actualCash: daysAgo === 0 ? null : 3500000,
          difference: daysAgo === 0 ? null : 0,
          notes: `UAT Shift Day ${dateStr}`,
        },
      });
    }

    // Check if orders already seeded for this day
    const existingOrdersCount = await prisma.order.count({
      where: {
        businessDate: orderDate,
        orderNumber: { startsWith: `ORD-${dateStr.replace(/-/g, "")}` },
      },
    });

    if (existingOrdersCount > 0) continue;

    // Create 12 - 18 orders per day
    const dailyOrderTemplates = [
      { items: [{ sku: "POP-CAR-LG", qty: 2 }, { sku: "BEV-COKE-LG", qty: 2 }], isQris: false, discount: 0 },
      { items: [{ sku: "CMB-CPL-BX", qty: 1 }, { sku: "BEV-WAT-600", qty: 1 }], isQris: true, discount: 5000 },
      { items: [{ sku: "SNK-NCH-SP", qty: 2 }, { sku: "BEV-LATTE-IC", qty: 2 }], isQris: true, discount: 0 },
      { items: [{ sku: "HOT-JMB-DG", qty: 2 }, { sku: "SNK-FF-CR", qty: 1 }, { sku: "BEV-COKE-LG", qty: 2 }], isQris: false, discount: 10000 },
      { items: [{ sku: "POP-SLT-RG", qty: 3 }, { sku: "BEV-WAT-600", qty: 3 }], isQris: true, discount: 0 },
      { items: [{ sku: "CMB-CPL-BX", qty: 2 }], isQris: false, discount: 0 },
      { items: [{ sku: "POP-CAR-LG", qty: 1 }, { sku: "HOT-JMB-DG", qty: 1 }, { sku: "BEV-COKE-LG", qty: 1 }], isQris: true, discount: 0 },
      { items: [{ sku: "SNK-FF-CR", qty: 2 }, { sku: "BEV-LATTE-IC", qty: 1 }], isQris: false, discount: 0 },
    ];

    for (let ordIdx = 0; ordIdx < dailyOrderTemplates.length; ordIdx++) {
      const template = dailyOrderTemplates[ordIdx];
      const ordTime = new Date(orderDate.getTime() + (11 + ordIdx) * 3600 * 1000);
      const dateKey = dateStr.replace(/-/g, "");
      const orderNumber = `ORD-${dateKey}-${String(ordIdx + 1).padStart(3, "0")}`;
      const displayNumber = `${dateKey.slice(4)}-${String(ordIdx + 1).padStart(3, "0")}`;

      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const it of template.items) {
        const product = productsMap[it.sku];
        const lineTotal = Number(product.price) * it.qty;
        subtotal += lineTotal;

        orderItemsData.push({
          sellableProductId: product.id,
          productName: product.name,
          productSku: product.sku,
          productCategory: product.categoryId,
          unitPrice: product.price,
          quantity: it.qty,
          subtotal: lineTotal,
          discountAmount: 0,
          createdAt: ordTime,
        });
        totalItemsCreated += it.qty;
      }

      const discountAmount = template.discount;
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = Math.round(taxableAmount * 0.1); // 10% Restaurant Tax
      const grandTotal = taxableAmount + taxAmount;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          dailyNumber: ordIdx + 1,
          displayNumber,
          businessDate: orderDate,
          customerName: `Tamu UAT ${ordIdx + 1}`,
          source: OrderSource.CASHIER,
          cashierId: cashierUser.id,
          orderType: OrderType.TAKEAWAY,
          status: OrderStatus.COMPLETED,
          subtotal,
          discountAmount,
          taxAmount,
          grandTotal,
          createdAt: ordTime,
          updatedAt: ordTime,
          items: {
            create: orderItemsData,
          },
          orderTaxes: {
            create: [
              {
                taxId: "tax-pb1",
                name: "PB1 Restaurant Tax (10%)",
                percentage: 10.0,
                amount: taxAmount,
              },
            ],
          },
        },
      });
      totalOrdersCreated++;

      // Create Payment record
      const isQris = template.isQris;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: isQris ? PaymentMethod.QRIS : PaymentMethod.CASH,
          status: PaymentStatus.PAID,
          amount: grandTotal,
          estimatedCash: isQris ? null : grandTotal + 20000,
          receivedCash: isQris ? null : grandTotal + 20000,
          changeAmount: isQris ? null : 20000,
          referenceNumber: isQris ? `QRIS-${orderNumber}` : null,
          confirmedById: cashierUser.id,
          confirmedAt: ordTime,
          cashierShiftId: shift.id,
          createdAt: ordTime,
          updatedAt: ordTime,
        },
      });
    }
  }

  console.log(`✓ Seeded ${totalOrdersCreated} Concession Orders & ${totalItemsCreated} Item units across 6 business dates`);

  console.log("==================================================");
  console.log("  Concession POS UAT Seeding Completed!           ");
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
