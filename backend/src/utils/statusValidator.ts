import { OrderStatus } from "@prisma/client";

export const isValidOrderTransition = (current: OrderStatus, next: OrderStatus): boolean => {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.NEW]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  return allowed[current]?.includes(next) || false;
};
