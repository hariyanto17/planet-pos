import { PrismaClient, OrderSource, OrderType, OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import process from "process";

const prisma = new PrismaClient();

async function seedPerformanceReportData() {
  console.log("Starting Reports Performance seed script...");

  // 1. Ensure tables exist
  let tables = await prisma.table.findMany();
  if (tables.length === 0) {
    await prisma.table.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        code: `T${i + 1}`,
        name: `Table ${i + 1}`,
      })),
    });
    tables = await prisma.table.findMany();
  }

  // 2. Ensure category exists
  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Concessions" },
    });
  }

  // 3. Ensure 100 different products exist
  let products = await prisma.product.findMany();
  if (products.length < 100) {
    const productsToCreate = [];
    for (let i = products.length; i < 100; i++) {
      productsToCreate.push({
        categoryId: category.id,
        sku: `PROD-${i.toString().padStart(3, "0")}`,
        name: `Snack Product ${i + 1}`,
        price: 10000 + (i % 10) * 5000,
      });
    }
    await prisma.product.createMany({ data: productsToCreate });
    products = await prisma.product.findMany();
  }

  // 4. Ensure user cashier exists
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        fullName: "System Accountant",
        username: "accounting",
        passwordHash: "$2a$10$7zBUpP0b2R4jN2p7.oJj.e8gqQp1uK2H.55v0.6a5J0X1pY01pY",
        role: "ACCOUNTING",
      },
    });
  }
  const cashierId = user.id;

  const totalOrders = 100000;
  const batchSize = 5000;

  console.log(`Generating ${totalOrders} orders in batches of ${batchSize}...`);

  for (let i = 0; i < totalOrders; i += batchSize) {
    const ordersBatch: any[] = [];
    const itemsBatch: any[] = [];
    const paymentsBatch: any[] = [];

    const currentBatchLimit = Math.min(batchSize, totalOrders - i);

    for (let j = 0; j < currentBatchLimit; j++) {
      const orderIdx = i + j;
      const orderId = `rep-order-${orderIdx}`;
      const orderNumber = `ORD-REP-${orderIdx.toString().padStart(6, "0")}`;
      const dailyNumber = (orderIdx % 500) + 1;
      
      // Distribute dates over last 6 months
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - (orderIdx % 180));
      orderDate.setHours(orderIdx % 24, orderIdx % 60, 0, 0);

      const displayNumber = `R${dailyNumber.toString().padStart(3, "0")}-${orderDate.toISOString().split("T")[0].replace(/-/g, "").slice(4)}-${orderIdx}`;

      // Status distribution: 70% COMPLETED, 20% READY, 10% PREPARING
      let status: OrderStatus = OrderStatus.COMPLETED;
      const statusRand = Math.random();
      if (statusRand < 0.10) {
        status = OrderStatus.PREPARING;
      } else if (statusRand < 0.30) {
        status = OrderStatus.READY;
      }

      const source = Math.random() > 0.4 ? OrderSource.SELF_ORDER : OrderSource.CASHIER;
      const orderType = Math.random() > 0.3 ? OrderType.DINE_IN : OrderType.TAKEAWAY;
      const table = orderType === OrderType.DINE_IN ? tables[orderIdx % tables.length] : null;
      const customerName = `Guest Representative ${orderIdx}`;

      // Order items generation (random products, random quantities, random discounts)
      const numItems = (orderIdx % 3) + 1; // 1 to 3 items
      let subtotal = 0;

      for (let k = 0; k < numItems; k++) {
        const prod = products[(orderIdx + k) % products.length];
        const qty = (orderIdx % 3) + 1; // 1, 2, or 3 qty
        const unitPrice = Number(prod.price);
        const itemSub = unitPrice * qty;
        subtotal += itemSub;

        itemsBatch.push({
          id: `rep-item-${orderIdx}-${k}`,
          orderId,
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku,
          productCategory: "Concessions",
          unitPrice,
          quantity: qty,
          subtotal: itemSub,
          discountAmount: 0,
          createdAt: orderDate,
        });
      }

      // Random order level discounts
      const discountAmount = orderIdx % 10 === 0 ? 5000 : 0;
      const taxAmount = Math.round(Math.max(0, subtotal - discountAmount) * 0.1);
      const grandTotal = Math.max(0, subtotal - discountAmount) + taxAmount;

      ordersBatch.push({
        id: orderId,
        orderNumber,
        dailyNumber,
        displayNumber,
        businessDate: orderDate,
        customerName,
        source,
        cashierId: source === OrderSource.CASHIER ? cashierId : null,
        tableId: table ? table.id : null,
        orderType,
        status,
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      // Payments: 60% CASH, 40% QRIS. Completed orders must be PAID.
      const method = Math.random() > 0.4 ? PaymentMethod.CASH : PaymentMethod.QRIS;
      
      let paymentStatus: PaymentStatus = PaymentStatus.PAID;
      if (status !== OrderStatus.COMPLETED) {
        paymentStatus = Math.random() > 0.2 ? PaymentStatus.PENDING : PaymentStatus.CANCELLED;
      }

      const estimatedCash = method === PaymentMethod.CASH ? Math.ceil(grandTotal / 10000) * 10000 : null;
      const changeAmount = estimatedCash ? estimatedCash - grandTotal : null;

      paymentsBatch.push({
        id: `rep-pay-${orderIdx}`,
        orderId,
        method,
        status: paymentStatus,
        amount: grandTotal,
        estimatedCash,
        receivedCash: paymentStatus === PaymentStatus.PAID ? estimatedCash : null,
        changeAmount,
        confirmedById: paymentStatus === PaymentStatus.PAID ? cashierId : null,
        confirmedAt: paymentStatus === PaymentStatus.PAID ? orderDate : null,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }

    await prisma.order.createMany({ data: ordersBatch });
    await prisma.orderItem.createMany({ data: itemsBatch });
    await prisma.payment.createMany({ data: paymentsBatch });
  }

  console.log("Reports performance seed data loaded successfully!");
}

seedPerformanceReportData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
