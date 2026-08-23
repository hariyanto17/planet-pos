import { prisma } from "../../utils/prisma";
import { createOrder, deductInventoryForCompletedOrder } from "../orders/service";
import { createPayment } from "../payments/service";
import { AppError } from "../../utils/errorHandler";
import { CreateOrderInput, PaymentMethod } from "@shared/types";
import { Prisma } from "@prisma/client";
import { getSettings } from "../settings/service";


interface CheckoutInput {
  customerName: string;
  tableId?: string;
  orderType: any;
  notes?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  estimatedCash?: number;
  receivedCash?: number;
}

export const checkout = async (cashierId: string | null, input: CheckoutInput) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.tableId) {
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const duplicateOrder = await tx.order.findFirst({
        where: {
          tableId: input.tableId,
          customerName: input.customerName,
          createdAt: { gte: fiveSecondsAgo },
        },
      });
      if (duplicateOrder) {
        throw new AppError("BAD_REQUEST", "Duplicate order checkout detected. Please wait a moment.");
      }
    }

    const orderInput: CreateOrderInput = {
      customerName: input.customerName,
      tableId: input.tableId,
      orderType: input.orderType,
      notes: input.notes,
      items: input.items.map((item) => ({
        sellableProductId: (item as any).sellableProductId || item.productId,
        quantity: item.quantity,
        note: (item as any).note,
      })),
    };
    const order = await createOrder(cashierId, orderInput, tx);

    const grandTotal = Number(order.grandTotal);
    const payment = await createPayment(
      cashierId,
      {
        orderId: order.id,
        method: input.paymentMethod,
        amount: grandTotal,
        estimatedCash: input.estimatedCash,
        receivedCash: input.receivedCash,
      },
      tx
    );

    const settings = await getSettings();
    let orderStatus = order.status;
    if (cashierId && payment.status === "PAID") {
      if (settings.appType === "CASHIER_ONLY") {
        orderStatus = "COMPLETED" as any;
        await deductInventoryForCompletedOrder(tx, order.id, cashierId);
        await tx.order.update({
          where: { id: order.id },
          data: { status: orderStatus },
        });
        await tx.orderTimeline.create({
          data: {
            orderId: order.id,
            status: orderStatus,
            description: "Order checkout completed by cashier and paid directly. Transitioned to COMPLETED in CASHIER_ONLY mode.",
            createdById: cashierId,
          },
        });
      } else {
        orderStatus = "PREPARING" as any;
        await tx.order.update({
          where: { id: order.id },
          data: { status: orderStatus },
        });
        await tx.orderTimeline.create({
          data: {
            orderId: order.id,
            status: orderStatus,
            description: "Order checkout completed by cashier and paid. Transitioned to PREPARING.",
            createdById: cashierId,
          },
        });
      }
    }

    return {
      orderId: order.id,
      displayNumber: order.displayNumber,
      customerName: order.customerName,
      orderStatus,
      paymentStatus: payment.status,
      grandTotal,
      changeAmount: payment.changeAmount ? Number(payment.changeAmount) : 0,
      paymentMethod: payment.method,
      orderType: order.orderType,
    };
  });
};
