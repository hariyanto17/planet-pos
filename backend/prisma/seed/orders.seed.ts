import { PrismaClient, OrderStatus, OrderSource, OrderType, PaymentMethod, PaymentStatus, StockMovementType, StockReferenceType, PromotionType } from "@prisma/client";

export async function seedOrders(prisma: PrismaClient) {
  console.log("Seeding Orders...");

  const cashier1 = await prisma.user.findUnique({ where: { username: "cashier1" } });
  const cashier2 = await prisma.user.findUnique({ where: { username: "cashier2" } });
  const kitchenWh = await prisma.warehouse.findUnique({ where: { code: "WH-KITCHEN" } });
  const openShift = await prisma.cashierShift.findFirst({ where: { status: "OPEN" } });
  const defaultTax = await prisma.tax.findFirst({ where: { name: "PPN 11%" } });
  const promo10 = await prisma.promotion.findFirst({ where: { name: "10% Discount" } });

  if (!cashier1 || !cashier2 || !kitchenWh || !openShift || !defaultTax || !promo10) {
    throw new Error("Pre-requisite users, warehouse, tax, shift, or promotion not found.");
  }

  // Load sellable finished goods
  const sellableProducts = await prisma.product.findMany({
    where: {
      sku: { in: ["FG-SALT-POP", "FG-CARM-POP", "FG-COLA-LG", "FG-MINERAL-WAT", "FG-HOT-COFFEE", "FG-VANILLA-ICE"] },
    },
    include: { category: true },
  });

  const statuses = [OrderStatus.NEW, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED];
  const paymentMethods = [PaymentMethod.CASH, PaymentMethod.QRIS];
  const customers = ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown", "Charlie Green", "David Miller", "Emma Wilson", "Frank Thomas"];

  const ordersCount = 50;

  for (let i = 1; i <= ordersCount; i++) {
    const orderNumber = `ORD-20260803-${i.toString().padStart(4, "0")}`;
    const displayNumber = `A${i.toString().padStart(2, "0")}`;
    const status = statuses[i % statuses.length];
    const method = paymentMethods[i % paymentMethods.length];
    const customerName = customers[i % customers.length];

    // Pick 1-3 items
    const itemCount = (i % 3) + 1;
    const selectedProducts = [];
    for (let k = 0; k < itemCount; k++) {
      selectedProducts.push(sellableProducts[(i + k) % sellableProducts.length]);
    }

    let subtotal = 0;
    const orderItemsData = selectedProducts.map((prod, index) => {
      const price = Number(prod.price);
      const qty = (index === 0 && i % 4 === 0) ? 2 : 1; // sometimes buy 2
      const itemSubtotal = price * qty;
      subtotal += itemSubtotal;

      return {
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku,
        productCategory: prod.category.name,
        unitPrice: price,
        quantity: qty,
        subtotal: itemSubtotal,
        discountAmount: 0,
      };
    });

    // Apply promotion to every 3rd order
    let discountAmount = 0;
    const orderPromotions = [];
    if (i % 3 === 0) {
      discountAmount = Math.round(subtotal * 0.10 * 100) / 100;
      orderPromotions.push({
        promotionId: promo10.id,
        name: promo10.name,
        type: PromotionType.PERCENT,
        percentValue: 10.00,
        packagePrice: null,
        discountAmount,
      });

      // Distribute discount amount to items
      orderItemsData.forEach((item) => {
        item.discountAmount = Math.round((item.subtotal / subtotal) * discountAmount * 100) / 100;
      });
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * 0.11 * 100) / 100;
    const grandTotal = taxableAmount + taxAmount;

    // Create Order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        dailyNumber: i,
        displayNumber,
        customerName,
        source: OrderSource.CASHIER,
        cashierId: cashier1.id,
        orderType: OrderType.TAKEAWAY,
        status,
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        notes: i % 5 === 0 ? "Extra popcorn seasoning please" : null,
        businessDate: new Date(),
        items: {
          create: orderItemsData,
        },
        orderTaxes: {
          create: [
            {
              taxId: defaultTax.id,
              name: defaultTax.name,
              percentage: defaultTax.percentage,
              amount: taxAmount,
            },
          ],
        },
        orderPromotions: orderPromotions.length > 0 ? { create: orderPromotions } : undefined,
      },
    });

    // Create Payment
    const paymentStatus = (status === OrderStatus.NEW && i % 5 === 0) ? PaymentStatus.PENDING : PaymentStatus.PAID;
    const isPaid = paymentStatus === PaymentStatus.PAID;

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method,
        status: paymentStatus,
        amount: grandTotal,
        estimatedCash: method === PaymentMethod.CASH ? Math.ceil(grandTotal / 50000) * 50000 : null,
        receivedCash: method === PaymentMethod.CASH ? Math.ceil(grandTotal / 50000) * 50000 : null,
        changeAmount: method === PaymentMethod.CASH ? (Math.ceil(grandTotal / 50000) * 50000) - grandTotal : null,
        referenceNumber: method === PaymentMethod.QRIS ? `QRIS-REF-${Date.now()}-${i}` : null,
        confirmedById: isPaid ? cashier1.id : null,
        confirmedAt: isPaid ? new Date() : null,
        cashierShiftId: openShift.id,
      },
    });

    // Create Timelines
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: OrderStatus.NEW,
        description: "Order created",
        createdById: cashier1.id,
      },
    });

    if (status !== OrderStatus.NEW) {
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.PREPARING,
          description: "Kitchen preparing items",
          createdById: cashier1.id,
        },
      });
    }

    if (status === OrderStatus.READY || status === OrderStatus.COMPLETED) {
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.READY,
          description: "Order ready for collection",
          createdById: cashier1.id,
        },
      });
    }

    if (status === OrderStatus.COMPLETED) {
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.COMPLETED,
          description: "Order completed and collected",
          createdById: cashier1.id,
        },
      });
    }

    // Deduct stock for inventory products from Kitchen Storage
    for (const item of orderItemsData) {
      const prod = sellableProducts.find((p) => p.id === item.productId);
      if (prod && prod.trackInventory) {
        const whStock = await prisma.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: kitchenWh.id,
              productId: prod.id,
            },
          },
        });

        const qtyBefore = whStock ? Number(whStock.quantity) : 0;
        const qtyAfter = qtyBefore - item.quantity;

        // Update warehouse stock
        await prisma.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: kitchenWh.id,
              productId: prod.id,
            },
          },
          update: { quantity: qtyAfter },
          create: { warehouseId: kitchenWh.id, productId: prod.id, quantity: qtyAfter },
        });

        // Add SALE stock ledger entry
        await prisma.stockLedger.create({
          data: {
            warehouseId: kitchenWh.id,
            productId: prod.id,
            movementType: StockMovementType.SALE,
            quantity: -item.quantity,
            quantityBefore: qtyBefore,
            quantityAfter: qtyAfter,
            referenceType: StockReferenceType.SALE,
            referenceId: order.id,
            remarks: `POS Sale: ${order.orderNumber}`,
            createdById: cashier1.id,
          },
        });
      }
    }
  }

  // Set one item in kitchen warehouse to negative stock to fulfill:
  // "Negative Stock (Kitchen only)" on dashboard.
  const caramelPopcorn = sellableProducts.find(p => p.sku === "FG-CARM-POP");
  if (caramelPopcorn) {
    const kitchenStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: kitchenWh.id,
          productId: caramelPopcorn.id,
        },
      },
    });

    const qtyBefore = kitchenStock ? Number(kitchenStock.quantity) : 0;
    const targetNegativeQty = -5.000;
    const adjustmentQty = targetNegativeQty - qtyBefore;

    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: kitchenWh.id,
          productId: caramelPopcorn.id,
        },
      },
      update: { quantity: targetNegativeQty },
      create: { warehouseId: kitchenWh.id, productId: caramelPopcorn.id, quantity: targetNegativeQty },
    });

    await prisma.stockLedger.create({
      data: {
        warehouseId: kitchenWh.id,
        productId: caramelPopcorn.id,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: adjustmentQty,
        quantityBefore: qtyBefore,
        quantityAfter: targetNegativeQty,
        referenceType: StockReferenceType.ADJUSTMENT,
        remarks: "Inventory overdraft adjustment (Kitchen negative stock demo)",
        createdById: cashier1.id,
      },
    });
  }

  // Also set Vanilla Ice Cream in Kitchen to Out Of Stock (0)
  const vanillaIce = sellableProducts.find(p => p.sku === "FG-VANILLA-ICE");
  if (vanillaIce) {
    const kitchenStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: kitchenWh.id,
          productId: vanillaIce.id,
        },
      },
    });

    const qtyBefore = kitchenStock ? Number(kitchenStock.quantity) : 0;
    const targetQty = 0;
    const adjustmentQty = targetQty - qtyBefore;

    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: kitchenWh.id,
          productId: vanillaIce.id,
        },
      },
      update: { quantity: targetQty },
      create: { warehouseId: kitchenWh.id, productId: vanillaIce.id, quantity: targetQty },
    });

    await prisma.stockLedger.create({
      data: {
        warehouseId: kitchenWh.id,
        productId: vanillaIce.id,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: adjustmentQty,
        quantityBefore: qtyBefore,
        quantityAfter: targetQty,
        referenceType: StockReferenceType.ADJUSTMENT,
        remarks: "Inventory adjustment to Out Of Stock",
        createdById: cashier1.id,
      },
    });
  }

  console.log(`Successfully seeded ${ordersCount} orders and related payments, ledger logs, and cashier shifts.`);
}
