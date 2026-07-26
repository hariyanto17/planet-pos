import { prisma } from "../../utils/prisma";

export const getPendingPayments = async () => {
  return prisma.order.findMany({
    where: {
      payments: {
        some: {
          status: "PENDING",
        },
      },
    },
    select: {
      id: true,
      displayNumber: true,
      customerName: true,
      orderType: true,
      source: true,
      status: true,
      grandTotal: true,
      createdAt: true,
      table: {
        select: {
          id: true,
          name: true,
        },
      },
      payments: {
        where: {
          status: "PENDING",
        },
        select: {
          id: true,
          method: true,
          status: true,
          amount: true,
          estimatedCash: true,
          changeAmount: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          note: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};
export default getPendingPayments;
