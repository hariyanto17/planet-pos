import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreatePaymentInput } from "./interface";
import { PaymentStatus, OrderStatus, Prisma, Payment } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { confirmPayment } from "../orders/service";
import { domainEvents, DOMAIN_EVENTS } from "../../utils/eventEmitter";

export const getPaymentsByOrderId = async (orderId: string) => {
  return prisma.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
};

export const createPayment = async (
  cashierId: string | null,
  input: CreatePaymentInput,
  parentTx?: Prisma.TransactionClient
) => {
  const execute = async (tx: Prisma.TransactionClient) => {
    // Fetch order
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      throw new AppError("BAD_REQUEST", `Cannot pay for an order in ${order.status} status`);
    }

    const paidAmount = order.payments
      .filter((p: Payment) => p.status === PaymentStatus.PAID)
      .reduce((sum: Decimal, p: Payment) => sum.add(p.amount), new Decimal(0));

    const remainingAmount = order.grandTotal.sub(paidAmount);
    if (remainingAmount.lte(0)) {
      throw new AppError("BAD_REQUEST", "Order is already fully paid");
    }

    const paymentAmount = new Decimal(input.amount);
    if (paymentAmount.gt(remainingAmount)) {
      throw new AppError(
        "BAD_REQUEST",
        `Payment amount (${paymentAmount}) exceeds remaining amount (${remainingAmount})`
      );
    }

    let changeAmount = new Decimal(0);
    let estimatedCash: Decimal | null = null;

    if (input.method === "CASH") {
      const cashInput = input.receivedCash || input.estimatedCash;
      if (cashInput) {
        const cashVal = new Decimal(cashInput);
        if (cashVal.lt(paymentAmount)) {
          throw new AppError("BAD_REQUEST", "Cash amount is less than the payment amount");
        }
        estimatedCash = cashVal;
        changeAmount = cashVal.sub(paymentAmount);
      }
    }

    if (cashierId) {
      const activeShift = await tx.cashierShift.findFirst({
        where: { userId: cashierId, status: "OPEN" },
      });
      if (!activeShift) {
        throw new AppError("BAD_REQUEST", "Active cashier shift is required for cashier payments");
      }
    }

    const payment = await tx.payment.create({
      data: {
        orderId: input.orderId,
        method: input.method,
        status: PaymentStatus.PENDING,
        amount: paymentAmount,
        estimatedCash,
        receivedCash: null,
        changeAmount,
        referenceNumber: input.referenceNumber || null,
        confirmedAt: null,
        confirmedById: null,
        cashierShiftId: null,
      },
    });

    return payment;
  };

  if (parentTx) {
    return execute(parentTx);
  } else {
    return prisma.$transaction(execute);
  }
};

export const confirmPendingPayment = async (
  paymentId: string,
  cashierId: string,
  input: { receivedCash?: number; referenceNumber?: string }
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new AppError("NOT_FOUND", "Payment not found");
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError("BAD_REQUEST", `Payment is already in ${payment.status} status`);
    }

    let changeAmount = new Decimal(0);
    if (payment.method === "CASH") {
      if (!input.receivedCash) {
        throw new AppError("BAD_REQUEST", "receivedCash is required to confirm CASH payment");
      }
      const received = new Decimal(input.receivedCash);
      if (received.lt(payment.amount)) {
        throw new AppError("BAD_REQUEST", "Received cash is less than the payment amount");
      }
      changeAmount = received.sub(payment.amount);
    }

    const activeShift = await tx.cashierShift.findFirst({
      where: { userId: cashierId, status: "OPEN" },
    });
    if (!activeShift) {
      throw new AppError("BAD_REQUEST", "Active cashier shift is required to confirm payment");
    }
    const cashierShiftId = activeShift.id;

    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        receivedCash: input.receivedCash ? new Decimal(input.receivedCash) : null,
        changeAmount,
        referenceNumber: input.referenceNumber || null,
        confirmedAt: new Date(),
        confirmedById: cashierId,
        cashierShiftId,
      },
    });

    // Delegate status updates to OrderService confirmPayment
    await confirmPayment(payment.orderId, payment.amount, cashierId, tx);

    domainEvents.emit(DOMAIN_EVENTS.PAYMENT_PAID, {
      paymentId: updatedPayment.id,
      orderId: payment.orderId,
      amount: payment.amount.toString(),
      method: payment.method,
    });

    return updatedPayment;
  });
};
