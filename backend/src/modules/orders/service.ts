import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateOrderInput } from "./interface";
import { OrderStatus, Prisma, Tax, Promotion, StockMovementType, StockReferenceType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createLedgerEntry } from "../inventory/stock.service";
import { isValidOrderTransition } from "../../utils/statusValidator";
import { domainEvents, DOMAIN_EVENTS } from "../../utils/eventEmitter";
import { getCommittedStockMap } from "../products/service";



export const getOrderById = async (id: string) => {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      table: true,
      orderPromotions: true,
      orderTaxes: true,
      timelines: {
        orderBy: { createdAt: "asc" },
      },
      cashier: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
  });
};

export const createOrder = async (
  cashierId: string | null,
  input: CreateOrderInput,
  parentTx?: Prisma.TransactionClient
) => {
  const now = new Date();

  const execute = async (tx: Prisma.TransactionClient) => {
    const isCashier = !!cashierId;

    if (cashierId) {
      const activeShift = await tx.cashierShift.findFirst({
        where: { userId: cashierId, status: "OPEN" },
      });
      if (!activeShift) {
        throw new AppError("BAD_REQUEST", "Active cashier shift is required to place orders");
      }
    }

    // Validate table if provided or required
    if (!input.tableId && !isCashier) {
      throw new AppError("BAD_REQUEST", "Table is required for self-orders");
    }

    if (input.tableId) {
      const table = await tx.table.findUnique({
        where: { id: input.tableId },
      });
      if (!table || !table.isActive || table.deletedAt) {
        throw new AppError("BAD_REQUEST", "Table is invalid or inactive");
      }
    }

    // 1. Fetch active taxes
    const activeTaxes = await tx.tax.findMany({ where: { isActive: true } });
    const totalTaxPercentage = activeTaxes.reduce(
      (sum, tax) => sum.add(tax.percentage),
      new Decimal(0)
    );

    // 2. Fetch products (deduplicated)
    const uniqueProductIds = Array.from(new Set(input.items.map((i) => i.productId)));
    const products = await tx.product.findMany({
      where: { id: { in: uniqueProductIds }, isActive: true, deletedAt: null },
      include: { category: true },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new AppError("BAD_REQUEST", "One or more products are invalid or inactive");
    }

    for (const product of products) {
      if (product.inventoryType !== "FINISHED_GOOD") {
        throw new AppError("BAD_REQUEST", "Only FINISHED_GOOD products can be sold through POS.");
      }
    }

    // Sellable stock calculation validation
    const productsWithRecipes = await tx.product.findMany({
      where: { id: { in: uniqueProductIds } },
      include: {
        recipe: {
          include: {
            items: {
              include: {
                componentProduct: true,
              },
            },
          },
        },
      },
    });

    const totalRequiredMap = new Map<string, number>();
    for (const item of input.items) {
      const product = productsWithRecipes.find((p) => p.id === item.productId);
      if (!product) continue;

      if (product.inventoryType === "FINISHED_GOOD") {
        if (product.recipe && product.recipe.items.length > 0) {
          for (const recipeItem of product.recipe.items) {
            if (recipeItem.componentProduct && !recipeItem.componentProduct.trackInventory) {
              continue;
            }
            const currentReq = totalRequiredMap.get(recipeItem.componentProductId) || 0;
            totalRequiredMap.set(
              recipeItem.componentProductId,
              currentReq + (item.quantity * Number(recipeItem.quantity))
            );
          }
        } else if (product.trackInventory) {
          const currentReq = totalRequiredMap.get(product.id) || 0;
          totalRequiredMap.set(product.id, currentReq + item.quantity);
        }
      }
    }

    if (totalRequiredMap.size > 0) {
      const activeWarehouseStocks = await tx.warehouseStock.findMany({
        where: {
          warehouse: {
            isActive: true,
          },
        },
        select: {
          productId: true,
          quantity: true,
        },
      });

      const totalStockMap = new Map<string, number>();
      for (const ws of activeWarehouseStocks) {
        const current = totalStockMap.get(ws.productId) || 0;
        totalStockMap.set(ws.productId, current + Number(ws.quantity));
      }

      const committedMap = await getCommittedStockMap(tx);

      for (const [prodId, reqQty] of totalRequiredMap.entries()) {
        const physicalStock = totalStockMap.get(prodId) || 0;
        const committedStock = committedMap.get(prodId) || 0;
        const availableStock = physicalStock - committedStock;

        if (availableStock < reqQty) {
          const prodInfo = await tx.product.findUnique({ where: { id: prodId } });
          const name = prodInfo ? prodInfo.name : prodId;
          throw new AppError(
            "BAD_REQUEST",
            `Insufficient inventory for ${name}. Required: ${reqQty}, Available: ${availableStock}`
          );
        }
      }
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Fetch active promotions
    const activePromos = await tx.promotion.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      include: { items: true },
    });

    // 4. Calculate initial items subtotal and check for percent promotions
    const calculatedItems = input.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.price!;
      const quantity = item.quantity;
      const subtotal = unitPrice.mul(quantity);

      // Find active PERCENT promotion for this product
      let discountAmount = new Decimal(0);
      let promotionName: string | null = null;
      let appliedPromo: Promotion | null = null;

      const percentPromo = activePromos.find(
        (p) =>
          p.type === "PERCENT" &&
          p.items.some((pi) => pi.productId === product.id)
      );

      if (percentPromo && percentPromo.percentValue) {
        discountAmount = subtotal.mul(percentPromo.percentValue).div(100);
        promotionName = percentPromo.name;
        appliedPromo = percentPromo;
      }

      return {
        productId: product.id,
        productSku: product.sku,
        productCategory: product.category.name,
        productName: product.name,
        unitPrice,
        quantity,
        subtotal,
        discountAmount,
        promotionName,
        appliedPromo,
        note: item.note || null,
      };
    });

    // 5. Look for PACKAGE promotions
    let totalPackageDiscount = new Decimal(0);
    let appliedPackagePromo: Promotion | null = null;

    const packagePromos = activePromos.filter((p) => p.type === "PACKAGE" && p.packagePrice);
    for (const promo of packagePromos) {
      let satisfies = true;
      let standardPriceSum = new Decimal(0);
      
      for (const promoItem of promo.items) {
        const orderItem = calculatedItems.find(
          (ci) => ci.productId === promoItem.productId && ci.quantity >= promoItem.quantity
        );
        if (!orderItem) {
          satisfies = false;
          break;
        }
        standardPriceSum = standardPriceSum.add(orderItem.unitPrice.mul(promoItem.quantity));
      }

      if (satisfies) {
        const discount = standardPriceSum.sub(promo.packagePrice!);
        if (discount.gt(totalPackageDiscount)) {
          totalPackageDiscount = discount;
          appliedPackagePromo = promo;
        }
      }
    }

    let orderSubtotal = new Decimal(0);
    let orderDiscount = new Decimal(0);

    calculatedItems.forEach((ci) => {
      orderSubtotal = orderSubtotal.add(ci.subtotal);
      orderDiscount = orderDiscount.add(ci.discountAmount);
    });

    if (totalPackageDiscount.gt(0)) {
      orderDiscount = orderDiscount.add(totalPackageDiscount);
    }

    const netTotal = orderSubtotal.sub(orderDiscount);
    const orderTax = netTotal.mul(totalTaxPercentage).div(100);
    const grandTotal = netTotal.add(orderTax);

    // 6. Generate display numbers
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await tx.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const dailyNumber = count + 1;
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const date = now.getDate().toString().padStart(2, "0");
    const displayNumber = `A${String(dailyNumber).padStart(3, "0")}-${month}${date}`;
    const orderNumber = `ORD-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(dailyNumber).padStart(4, "0")}`;

    // Create the Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        dailyNumber,
        displayNumber,
        businessDate: now,
        customerName: input.customerName,
        source: cashierId ? "CASHIER" : "SELF_ORDER",
        cashierId,
        tableId: input.tableId || null,
        orderType: input.orderType as any,
        status: OrderStatus.NEW,
        subtotal: orderSubtotal,
        discountAmount: orderDiscount,
        taxAmount: orderTax,
        grandTotal,
        notes: input.notes || null,
        items: {
          create: calculatedItems.map((ci) => ({
            productId: ci.productId,
            productName: ci.productName,
            productSku: ci.productSku,
            productCategory: ci.productCategory,
            unitPrice: ci.unitPrice,
            quantity: ci.quantity,
            subtotal: ci.subtotal,
            promotionName: ci.promotionName || (totalPackageDiscount.gt(0) ? appliedPackagePromo?.name : null),
            discountAmount: ci.discountAmount,
            note: ci.note,
          })),
        },
      },
      include: {
        items: true,
        table: true,
        cashier: {
          select: { id: true, fullName: true, username: true, role: true },
        },
      },
    });

    // 7. Write Order Promotions Snapshots
    const appliedPromosToSave: { promo: Promotion; amount: Decimal }[] = [];
    calculatedItems.forEach((ci) => {
      if (ci.appliedPromo) {
        appliedPromosToSave.push({ promo: ci.appliedPromo, amount: ci.discountAmount });
      }
    });

    if (totalPackageDiscount.gt(0) && appliedPackagePromo) {
      appliedPromosToSave.push({ promo: appliedPackagePromo, amount: totalPackageDiscount });
    }

    if (appliedPromosToSave.length > 0) {
      await tx.orderPromotion.createMany({
        data: appliedPromosToSave.map((ap) => ({
          orderId: order.id,
          promotionId: ap.promo.id,
          name: ap.promo.name,
          type: ap.promo.type,
          percentValue: ap.promo.percentValue,
          packagePrice: ap.promo.packagePrice,
          discountAmount: ap.amount,
        })),
      });
    }

    // 8. Write Order Taxes Snapshots
    if (activeTaxes.length > 0) {
      await tx.orderTax.createMany({
        data: activeTaxes.map((tax) => ({
          orderId: order.id,
          taxId: tax.id,
          name: tax.name,
          percentage: tax.percentage,
          amount: netTotal.mul(tax.percentage).div(100),
        })),
      });
    }

    // 9. Write Initial OrderTimeline
    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: OrderStatus.NEW,
        description: "Order created",
        createdById: cashierId,
        metadata: { customerName: input.customerName, orderType: input.orderType },
      },
    });

    // Emit event
    domainEvents.emit(DOMAIN_EVENTS.ORDER_CREATED, { orderId: order.id, displayNumber: order.displayNumber });

    return order;
  };

  if (parentTx) {
    return execute(parentTx);
  } else {
    return prisma.$transaction(execute);
  }
};

export const updateOrderStatus = async (id: string, status: OrderStatus, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new AppError("UNAUTHORIZED", "User not found");
    }

    if (
      status === OrderStatus.PREPARING ||
      status === OrderStatus.READY ||
      status === OrderStatus.COMPLETED
    ) {
      if (user.role !== "KITCHEN" && user.role !== "ADMIN") {
        throw new AppError("FORBIDDEN", "Only KITCHEN or ADMIN roles can update order operational status.");
      }
    }

    if (!isValidOrderTransition(order.status, status)) {
      throw new AppError(
        "BAD_REQUEST",
        `Invalid order status transition from ${order.status} to ${status}`
      );
    }

    // Write timeline
    await tx.orderTimeline.create({
      data: {
        orderId: id,
        status: status,
        description: `Order status manually updated to ${status}`,
        createdById: userId,
      },
    });

    if (status === OrderStatus.COMPLETED) {
      await deductInventoryForCompletedOrder(tx, id, userId);
    }

    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status: status },
      include: {
        items: true,
        payments: true,
        table: true,
        orderPromotions: true,
        orderTaxes: true,
        timelines: {
          orderBy: { createdAt: "asc" },
        },
        cashier: {
          select: { id: true, fullName: true, username: true, role: true },
        },
      },
    });

    // Emit events
    if (status === OrderStatus.READY) {
      domainEvents.emit(DOMAIN_EVENTS.ORDER_READY, {
        orderId: id,
        displayNumber: updatedOrder.displayNumber,
      });
    } else if (status === OrderStatus.COMPLETED) {
      domainEvents.emit(DOMAIN_EVENTS.ORDER_COMPLETED, {
        orderId: id,
        displayNumber: updatedOrder.displayNumber,
      });
    } else if (status === OrderStatus.CANCELLED) {
      domainEvents.emit(DOMAIN_EVENTS.ORDER_COMPLETED, {
        orderId: id,
        displayNumber: updatedOrder.displayNumber,
        status: "CANCELLED",
      });
    }

    return updatedOrder;
  });
};

export const confirmPayment = async (
  orderId: string,
  paymentAmount: Decimal,
  cashierId: string | null,
  tx: Prisma.TransactionClient
) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found");
  }

  const totalPaid = order.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum.add(p.amount), new Decimal(0));

  if (totalPaid.gte(order.grandTotal)) {
    if (order.status === OrderStatus.READY) {
      await deductInventoryForCompletedOrder(tx, orderId, cashierId);

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED },
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.COMPLETED,
          description: "Payment confirmed. Order marked COMPLETED.",
          createdById: cashierId,
          metadata: {
            totalPaid: totalPaid.toString(),
            grandTotal: order.grandTotal.toString(),
          },
        },
      });

      domainEvents.emit(DOMAIN_EVENTS.ORDER_COMPLETED, {
        orderId,
        displayNumber: order.displayNumber,
      });
    } else {
      await tx.orderTimeline.create({
        data: {
          orderId,
          status: order.status,
          description: `Payment confirmed. Order remains in ${order.status} state.`,
          createdById: cashierId,
          metadata: {
            totalPaid: totalPaid.toString(),
            grandTotal: order.grandTotal.toString(),
          },
        },
      });
    }
  }
};

export const deductInventoryForCompletedOrder = async (
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string | null
) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) return;

  const kitchenWarehouse = await tx.warehouse.findFirst({
    where: { isDefaultKitchenStorage: true, warehouseType: "KITCHEN_STORAGE" },
  });

  const defaultWarehouseCode = process.env.DEFAULT_SALES_WAREHOUSE_CODE || "CONCESSION";
  let fallbackWarehouse = await tx.warehouse.findFirst({
    where: { code: defaultWarehouseCode },
  });
  if (!fallbackWarehouse) {
    fallbackWarehouse = kitchenWarehouse;
  }

  const productIds = order.items.map((item) => item.productId);
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    include: {
      recipe: {
        include: {
          items: true
        }
      }
    }
  });
  const productsMap = new Map(products.map((p) => [p.id, p]));

  for (const item of order.items) {
    const product = productsMap.get(item.productId);
    if (!product) continue;

    if (product.recipe) {
      if (!kitchenWarehouse) {
        throw new AppError("BAD_REQUEST", "Penyimpanan Dapur (Kitchen Storage) default tidak ditemukan untuk pengurangan resep.");
      }

      for (const recipeItem of product.recipe.items) {
        const componentQty = -Number(item.quantity) * Number(recipeItem.quantity);
        await createLedgerEntry(tx, {
          productId: recipeItem.componentProductId,
          warehouseId: kitchenWarehouse.id,
          movementType: StockMovementType.RECIPE_CONSUMPTION,
          quantity: componentQty,
          referenceType: StockReferenceType.RECIPE_CONSUMPTION,
          referenceId: order.id,
          remarks: `Recipe consumption from POS Order ${order.displayNumber} for product ${product.name}`,
          createdById: userId,
        });
      }
    } else {
      if (product.trackInventory && product.inventoryType === "FINISHED_GOOD") {
        if (!fallbackWarehouse) {
          throw new AppError("BAD_REQUEST", `Warehouse default untuk penjualan tidak ditemukan.`);
        }
        const deductionQty = -Number(item.quantity);
        await createLedgerEntry(tx, {
          productId: product.id,
          warehouseId: fallbackWarehouse.id,
          movementType: StockMovementType.SALE,
          quantity: deductionQty,
          referenceType: StockReferenceType.SALE,
          referenceId: order.id,
          remarks: `Auto stock deduction from POS Order ${order.displayNumber}`,
          createdById: userId,
        });
      }
    }
  }
};
