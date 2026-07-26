import { PrismaClient, OrderSource, OrderType, OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import process from "process";

const prisma = new PrismaClient();

async function seedPerformanceData() {
  console.log("Starting performance seed script...");
  
  // Ensure tables exist
  let tables = await prisma.table.findMany();
  if (tables.length === 0) {
    await prisma.table.createMany({
      data: [
        { code: "T1", name: "Table 1" },
        { code: "T2", name: "Table 2" },
        { code: "T3", name: "Table 3" },
        { code: "T4", name: "Table 4" },
        { code: "T5", name: "Table 5" },
      ],
    });
    tables = await prisma.table.findMany();
  }

  // Ensure category and products exist
  let products = await prisma.product.findMany();
  if (products.length === 0) {
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Snacks" },
      });
    }
    await prisma.product.createMany({
      data: [
        { categoryId: category.id, sku: "POP-SWT", name: "Sweet Popcorn", price: 25000 },
        { categoryId: category.id, sku: "POP-SLT", name: "Salted Popcorn", price: 22000 },
        { categoryId: category.id, sku: "SOD-LRG", name: "Large Soda", price: 18000 },
        { categoryId: category.id, sku: "SOD-REG", name: "Regular Soda", price: 15000 },
        { categoryId: category.id, sku: "HTD-ORG", name: "Original Hotdog", price: 30000 },
      ],
    });
    products = await prisma.product.findMany();
  }

  // Ensure active cashier user exists
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        fullName: "System Admin",
        username: "admin",
        passwordHash: "$2a$10$7zBUpP0b2R4jN2p7.oJj.e8gqQp1uK2H.55v0.6a5J0X1pY01pY",
        role: "ADMIN",
      },
    });
  }

  const cashierId = user.id;
  const totalOrdersToCreate = 100000;
  const batchSize = 5000;

  console.log(`Generating ${totalOrdersToCreate} orders in batches of ${batchSize}...`);

  for (let i = 0; i < totalOrdersToCreate; i += batchSize) {
    const ordersBatch: any[] = [];
    const itemsBatch: any[] = [];
    const paymentsBatch: any[] = [];

    const currentBatchLimit = Math.min(batchSize, totalOrdersToCreate - i);

    for (let j = 0; j < currentBatchLimit; j++) {
      const orderIdx = i + j;
      const orderId = `perf-order-${orderIdx}`;
      const orderNumber = `ORD-${orderIdx.toString().padStart(6, "0")}`;
      const dailyNumber = (orderIdx % 500) + 1;
      const displayNumber = `A${dailyNumber.toString().padStart(3, "0")}`;

      // Status distribution: 5% PREPARING, 5% READY, 85% COMPLETED, 5% CANCELLED
      let status: OrderStatus = OrderStatus.COMPLETED;
      const statusRand = Math.random();
      if (statusRand < 0.05) status = OrderStatus.PREPARING;
      else if (statusRand < 0.10) status = OrderStatus.READY;
      else if (statusRand < 0.15) status = OrderStatus.CANCELLED;

      const source = Math.random() > 0.5 ? OrderSource.SELF_ORDER : OrderSource.CASHIER;
      const orderType = Math.random() > 0.3 ? OrderType.DINE_IN : OrderType.TAKEAWAY;
      const table = orderType === OrderType.DINE_IN ? tables[orderIdx % tables.length] : null;
      const customerName = `Guest ${orderIdx}`;

      // Distribute dates over last 6 months
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - (orderIdx % 180));
      orderDate.setHours(orderIdx % 24, orderIdx % 60, 0, 0);

      // Generate items
      const numItems = (orderIdx % 3) + 1; // 1 to 3 items
      let subtotal = 0;

      for (let k = 0; k < numItems; k++) {
        const prod = products[(orderIdx + k) % products.length];
        const qty = (orderIdx % 2) + 1; // 1 or 2 qty
        const unitPrice = Number(prod.price);
        const itemSub = unitPrice * qty;
        subtotal += itemSub;

        itemsBatch.push({
          id: `perf-item-${orderIdx}-${k}`,
          orderId,
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku,
          productCategory: "Snacks",
          unitPrice,
          quantity: qty,
          subtotal: itemSub,
          discountAmount: 0,
        });
      }

      const discountAmount = 0;
      const taxAmount = Math.round(subtotal * 0.1);
      const grandTotal = subtotal + taxAmount;

      ordersBatch.push({
        id: orderId,
        orderNumber,
        dailyNumber,
        displayNumber: `${displayNumber}-${orderDate.toISOString().split("T")[0].replace(/-/g, "").slice(4)}-${orderIdx}`,
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

      // Payment Status: 90% PAID, 8% PENDING, 2% CANCELLED
      let paymentStatus: PaymentStatus = PaymentStatus.PAID;
      if (status !== OrderStatus.COMPLETED) {
        const payRand = Math.random();
        if (payRand < 0.8) paymentStatus = PaymentStatus.PENDING;
        else if (payRand < 0.9) paymentStatus = PaymentStatus.CANCELLED;
      }

      const method = Math.random() > 0.4 ? PaymentMethod.CASH : PaymentMethod.QRIS;
      const estimatedCash = method === PaymentMethod.CASH ? Math.ceil(grandTotal / 50000) * 50000 : null;
      const changeAmount = estimatedCash ? estimatedCash - grandTotal : null;

      paymentsBatch.push({
        id: `perf-pay-${orderIdx}`,
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

  console.log("Performance seed data loaded successfully!");
}

seedPerformanceData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
