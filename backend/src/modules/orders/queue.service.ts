import { prisma } from "../../utils/prisma";

export const getKitchenQueue = async () => {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ["NEW", "PREPARING", "READY"],
      },
    },
    select: {
      id: true,
      displayNumber: true,
      customerName: true,
      orderType: true,
      source: true,
      createdAt: true,
      status: true,
      notes: true,
      table: {
        select: {
          id: true,
          name: true,
        },
      },
      payments: {
        select: {
          id: true,
          method: true,
          status: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          productSku: true,
          quantity: true,
          note: true,
        },
      },
    },
  });

  // Sorting priorities: READY first, PREPARING second, NEW third. Oldest (createdAt asc) first.
  const ready = orders
    .filter((o) => o.status === "READY")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const preparing = orders
    .filter((o) => o.status === "PREPARING")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const newOrders = orders
    .filter((o) => o.status === "NEW")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return [...ready, ...preparing, ...newOrders];
};
