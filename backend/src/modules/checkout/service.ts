import { prisma } from "../../utils/prisma";
import { createOrder } from "../orders/service";
import { createPayment } from "../payments/service";
import { AppError } from "../../utils/errorHandler";
import { CreateOrderInput, PaymentMethod } from "@shared/types";
import { Prisma } from "@prisma/client";

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
      items: input.items,
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

    return {
      orderId: order.id,
      displayNumber: order.displayNumber,
      customerName: order.customerName,
      orderStatus: order.status,
      paymentStatus: payment.status,
      grandTotal,
      changeAmount: payment.changeAmount ? Number(payment.changeAmount) : 0,
      paymentMethod: payment.method,
      orderType: order.orderType,
    };
  });
};
