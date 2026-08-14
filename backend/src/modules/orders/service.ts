import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateOrderInput } from "./interface";
import { OrderStatus, Prisma, StockMovementType, StockReferenceType } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
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
      timelines: { orderBy: { createdAt: "asc" } },
      cashier: { select: { id: true, fullName: true, username: true, role: true } },
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
    const sellableProductIds = [...new Set(
      input.items
        .map((item) => item.sellableProductId)
        .filter((id): id is string => !!id)
    )];

    if (sellableProductIds.length === 0) {
      throw new AppError("BAD_REQUEST", "Each order item must include a sellableProductId.");
    }

    const sellableProducts = await tx.sellableProduct.findMany({
      where: { id: { in: sellableProductIds }, isActive: true },
      include: {
        category: true,
        recipe: {
          include: {
            items: { include: { materialVariant: true } },
          },
        },
      },
    });

    if (sellableProducts.length !== sellableProductIds.length) {
      throw new AppError("BAD_REQUEST", "One or more sellable products are invalid or inactive.");
    }

    const activeTaxes = await tx.tax.findMany({ where: { isActive: true } });
    const totalTaxPercentage = activeTaxes.reduce((sum, tax) => sum.add(tax.percentage), new Decimal(0));

    const sellableProductMap = new Map(sellableProducts.map((product) => [product.id, product]));
    const totalRequiredMap = new Map<string, number>();

    for (const item of input.items) {
      if (!item.sellableProductId) continue;
      const product = sellableProductMap.get(item.sellableProductId);
      if (!product) continue;

      const recipe = product.recipe;
      if (recipe && recipe.items.length > 0) {
        for (const recipeItem of recipe.items) {
          const key = `mv:${recipeItem.materialVariantId}`;
          const currentReq = totalRequiredMap.get(key) || 0;
          totalRequiredMap.set(key, currentReq + Number(item.quantity) * Number(recipeItem.quantity));
        }
      } else if (product.directSaleMaterialVariantId) {
        const key = `mv:${product.directSaleMaterialVariantId}`;
        const currentReq = totalRequiredMap.get(key) || 0;
        totalRequiredMap.set(key, currentReq + Number(item.quantity));
      }
    }

    if (totalRequiredMap.size > 0) {
      const inventoryStocks = await tx.inventoryStock.findMany({
        where: {
          warehouse: { isActive: true },
          materialVariantId: { in: [...new Set([...totalRequiredMap.keys()].map((key) => key.replace("mv:", "")))] },
        },
        select: { materialVariantId: true, quantity: true },
      });

      const totalStockMap = new Map<string, number>();
      for (const stock of inventoryStocks) {
        const current = totalStockMap.get(stock.materialVariantId) || 0;
        totalStockMap.set(stock.materialVariantId, current + Number(stock.quantity));
      }

      const committedMap = await getCommittedStockMap(tx);
      for (const [key, reqQty] of totalRequiredMap.entries()) {
        const materialVariantId = key.replace("mv:", "");
        const physicalStock = totalStockMap.get(materialVariantId) || 0;
        const committedStock = committedMap.get(key) || 0;
        const availableStock = physicalStock - committedStock;

        if (availableStock < reqQty) {
          const materialVariant = await tx.materialVariant.findUnique({ where: { id: materialVariantId } });
          throw new AppError(
            "BAD_REQUEST",
            `Insufficient inventory for ${materialVariant?.name ?? materialVariantId}. Required: ${reqQty}, Available: ${availableStock}`
          );
        }
      }
    }

    const calculatedItems = input.items.map((item) => {
      if (!item.sellableProductId) {
        throw new AppError("BAD_REQUEST", "Each order item must include a sellableProductId.");
      }

      const product = sellableProductMap.get(item.sellableProductId)!;
      const unitPrice = product.price ? new Decimal(product.price.toString()) : new Decimal(0);
      const quantity = Number(item.quantity);
      const subtotal = unitPrice.mul(quantity);

      let discountAmount = new Decimal(0);
      let promotionName: string | null = null;
      let appliedPromo: any = null;

      const percentPromo = activeTaxes.length > 0 ? null : null;
      void percentPromo;

      const promo = (async () => {
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

        return activePromos.find((p) => p.type === "PERCENT" && p.items.some((pi) => pi.sellableProductId === product.id));
      })();

      return { product, unitPrice, quantity, subtotal, discountAmount, promotionName, appliedPromo, note: item.note || null };
    });

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

    const resolvedItems = await Promise.all(
      input.items.map(async (item) => {
        if (!item.sellableProductId) {
          throw new AppError("BAD_REQUEST", "Each order item must include a sellableProductId.");
        }

        const product = sellableProductMap.get(item.sellableProductId)!;
        const unitPrice = product.price ? new Decimal(product.price.toString()) : new Decimal(0);
        const quantity = Number(item.quantity);
        const subtotal = unitPrice.mul(quantity);

        let discountAmount = new Decimal(0);
        let promotionName: string | null = null;

        const percentPromo = activePromos.find(
          (promo) => promo.type === "PERCENT" && promo.items.some((pi) => pi.sellableProductId === product.id)
        );

        if (percentPromo && percentPromo.percentValue) {
          discountAmount = subtotal.mul(percentPromo.percentValue).div(100);
          promotionName = percentPromo.name;
        }

        return {
          sellableProductId: product.id,
          productName: product.name,
          productSku: product.sku,
          productCategory: product.category?.name ?? null,
          unitPrice,
          quantity,
          subtotal,
          discountAmount,
          promotionName,
          note: item.note || null,
        };
      })
    );

    let totalPackageDiscount = new Decimal(0);
    const packagePromos = activePromos.filter((promo) => promo.type === "PACKAGE" && promo.packagePrice);
    for (const promo of packagePromos) {
      let satisfies = true;
      let standardPriceSum = new Decimal(0);
      for (const promoItem of promo.items) {
        const orderItem = resolvedItems.find(
          (ci) => ci.sellableProductId === promoItem.sellableProductId && ci.quantity >= promoItem.quantity
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
        }
      }
    }

    let orderSubtotal = new Decimal(0);
    let orderDiscount = new Decimal(0);
    for (const item of resolvedItems) {
      orderSubtotal = orderSubtotal.add(item.subtotal);
      orderDiscount = orderDiscount.add(item.discountAmount);
    }
    orderDiscount = orderDiscount.add(totalPackageDiscount);

    const netTotal = orderSubtotal.sub(orderDiscount);
    const orderTax = netTotal.mul(totalTaxPercentage).div(100);
    const grandTotal = netTotal.add(orderTax);

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await tx.order.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } });
    const dailyNumber = count + 1;
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const date = now.getDate().toString().padStart(2, "0");
    const displayNumber = `A${String(dailyNumber).padStart(3, "0")}-${month}${date}`;
    const orderNumber = `ORD-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(dailyNumber).padStart(4, "0")}`;

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
          create: resolvedItems.map((item) => ({
            sellableProductId: item.sellableProductId,
            productName: item.productName,
            productSku: item.productSku,
            productCategory: item.productCategory,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
            promotionName: item.promotionName || (totalPackageDiscount.gt(0) ? "Package Promotion" : null),
            discountAmount: item.discountAmount,
            note: item.note,
          })),
        },
      },
      include: { items: true, table: true, cashier: { select: { id: true, fullName: true, username: true, role: true } } },
    });

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

    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: OrderStatus.NEW,
        description: "Order created",
        createdById: cashierId,
        metadata: { customerName: input.customerName, orderType: input.orderType },
      },
    });

    domainEvents.emit(DOMAIN_EVENTS.ORDER_CREATED, { orderId: order.id, displayNumber: order.displayNumber });
    return order;
  };

  if (parentTx) return execute(parentTx);
  return prisma.$transaction(execute);
};

export const updateOrderStatus = async (id: string, status: OrderStatus, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({ where: { id }, include: { payments: true } });
    if (!order) throw new AppError("NOT_FOUND", "Order not found");

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("UNAUTHORIZED", "User not found");

    const operationalStatuses = new Set<OrderStatus>([
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.COMPLETED,
    ]);
    if (operationalStatuses.has(status)) {
      if (user.role !== "KITCHEN" && user.role !== "ADMIN") {
        throw new AppError("FORBIDDEN", "Only KITCHEN or ADMIN roles can update order operational status.");
      }
    }

    if (!isValidOrderTransition(order.status, status)) {
      throw new AppError("BAD_REQUEST", `Invalid order status transition from ${order.status} to ${status}`);
    }

    await tx.orderTimeline.create({
      data: { orderId: id, status, description: `Order status manually updated to ${status}`, createdById: userId },
    });

    if (status === OrderStatus.COMPLETED) {
      await deductInventoryForCompletedOrder(tx, id, userId);
    }

    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status },
      include: { items: true, payments: true, table: true, orderPromotions: true, orderTaxes: true, timelines: { orderBy: { createdAt: "asc" } }, cashier: { select: { id: true, fullName: true, username: true, role: true } } },
    });

    if (status === OrderStatus.READY) {
      domainEvents.emit(DOMAIN_EVENTS.ORDER_READY, { orderId: id, displayNumber: updatedOrder.displayNumber });
    } else if (status === OrderStatus.COMPLETED) {
      domainEvents.emit(DOMAIN_EVENTS.ORDER_COMPLETED, { orderId: id, displayNumber: updatedOrder.displayNumber });
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
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new AppError("NOT_FOUND", "Order not found");

  const totalPaid = order.payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum.add(p.amount), new Decimal(0));
  if (totalPaid.gte(order.grandTotal) && order.status === OrderStatus.READY) {
    await deductInventoryForCompletedOrder(tx, orderId, cashierId);
    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.COMPLETED } });
    await tx.orderTimeline.create({
      data: {
        orderId,
        status: OrderStatus.COMPLETED,
        description: "Payment confirmed. Order marked COMPLETED.",
        createdById: cashierId,
        metadata: { totalPaid: totalPaid.toString(), grandTotal: order.grandTotal.toString() },
      },
    });
    domainEvents.emit(DOMAIN_EVENTS.ORDER_COMPLETED, { orderId, displayNumber: order.displayNumber });
  }
};

export const deductInventoryForCompletedOrder = async (
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string | null
) => {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  const kitchenWarehouse = await tx.warehouse.findFirst({
    where: { isDefaultKitchenStorage: true, warehouseType: "KITCHEN_STORAGE" },
  });

  const defaultWarehouseCode = process.env.DEFAULT_SALES_WAREHOUSE_CODE || "CONCESSION";
  let fallbackWarehouse = await tx.warehouse.findFirst({ where: { code: defaultWarehouseCode } });
  if (!fallbackWarehouse && kitchenWarehouse) {
    fallbackWarehouse = kitchenWarehouse;
  }

  const sellableIds = order.items
    .map((item) => item.sellableProductId)
    .filter((id): id is string => !!id);

  if (sellableIds.length === 0) return;

  const sellableProducts = await tx.sellableProduct.findMany({
    where: { id: { in: sellableIds } },
    include: { recipe: { include: { items: true } } },
  });
  const sellableMap = new Map(sellableProducts.map((product) => [product.id, product]));

  for (const item of order.items) {
    const sellable = sellableMap.get(item.sellableProductId);
    if (!sellable) continue;

    if (sellable.recipe && sellable.recipe.items.length > 0) {
      if (!kitchenWarehouse) {
        throw new AppError("BAD_REQUEST", "Kitchen storage warehouse is required for recipe-based stock consumption.");
      }

      for (const recipeItem of sellable.recipe.items) {
        const quantityToDeduct = -Number(item.quantity) * Number(recipeItem.quantity);
        const currentStock = await tx.inventoryStock.findUnique({
          where: {
            warehouseId_materialVariantId: {
              warehouseId: kitchenWarehouse.id,
              materialVariantId: recipeItem.materialVariantId,
            },
          },
        });

        const currentQty = currentStock ? new Decimal(currentStock.quantity) : new Decimal(0);
        const updatedQty = currentQty.add(new Decimal(quantityToDeduct));

        // Allow negative stock for kitchen storage, but check total kitchen storage available
        if (updatedQty.lt(0)) {
          const allKitchenStocks = await tx.inventoryStock.findMany({
            where: {
              materialVariantId: recipeItem.materialVariantId,
              warehouse: {
                warehouseType: "KITCHEN_STORAGE",
                isActive: true,
              },
            },
          });

          const totalKitchenStock = allKitchenStocks.reduce(
            (sum, stock) => sum.add(stock.quantity),
            new Decimal(0)
          );

          const minAllowedNegative = totalKitchenStock.negated();
          if (updatedQty.lt(minAllowedNegative)) {
            throw new AppError(
              "BAD_REQUEST",
              `Insufficient total kitchen storage for variant ${recipeItem.materialVariantId}. ` +
              `Current in this warehouse: ${currentQty.toString()}, ` +
              `Total across all kitchens: ${totalKitchenStock.toString()}, ` +
              `Cannot go below: ${minAllowedNegative.toString()}`
            );
          }
        }

        await tx.inventoryStock.upsert({
          where: {
            warehouseId_materialVariantId: {
              warehouseId: kitchenWarehouse.id,
              materialVariantId: recipeItem.materialVariantId,
            },
          },
          create: { warehouseId: kitchenWarehouse.id, materialVariantId: recipeItem.materialVariantId, quantity: updatedQty },
          update: { quantity: updatedQty },
        });

        await tx.stockLedger.create({
          data: {
            warehouseId: kitchenWarehouse.id,
            materialVariantId: recipeItem.materialVariantId,
            movementType: StockMovementType.RECIPE_CONSUMPTION,
            quantity: new Decimal(quantityToDeduct),
            quantityBefore: currentQty,
            quantityAfter: updatedQty,
            referenceType: StockReferenceType.RECIPE_CONSUMPTION,
            referenceId: order.id,
            remarks: `Recipe consumption from order ${order.displayNumber}`,
            createdById: userId,
          },
        });
      }
      continue;
    }

    if (sellable.directSaleMaterialVariantId) {
      if (!fallbackWarehouse) {
        throw new AppError("BAD_REQUEST", "Fallback sales warehouse is required for direct-sale stock deduction.");
      }

      await createLedgerEntry(tx, {
        materialVariantId: sellable.directSaleMaterialVariantId,
        warehouseId: fallbackWarehouse.id,
        movementType: StockMovementType.SALE,
        quantity: -Number(item.quantity),
        referenceType: StockReferenceType.SALE,
        referenceId: order.id,
        remarks: `Auto stock deduction from order ${order.displayNumber}`,
        createdById: userId,
      });
    }
  }
};
