import { prisma } from "../../utils/prisma";
import { OrderStatus, Prisma } from "@prisma/client";
import { AppError } from "../../utils/errorHandler";

export interface OrderQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  businessDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const getAllOrdersPaginated = async (options: OrderQueryOptions = {}) => {
  const page = Number(options.page) || 1;
  const limit = Math.min(Number(options.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const take = limit;

  const where: Prisma.OrderWhereInput = {};

  // Status Filter (comma separated)
  if (options.status) {
    const statuses = options.status.split(",") as OrderStatus[];
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }
  }

  // Payment Status & Method Filters
  if (options.paymentStatus || options.paymentMethod) {
    where.payments = {
      some: {
        ...(options.paymentStatus ? { status: options.paymentStatus as any } : {}),
        ...(options.paymentMethod ? { method: options.paymentMethod as any } : {}),
      },
    };
  }

  // Source Filter
  if (options.source) {
    where.source = options.source as any;
  }

  // businessDate validation and resolving to start/end dates
  let startDate = options.startDate;
  let endDate = options.endDate;

  if (options.businessDate) {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (options.businessDate !== "TODAY" && options.businessDate !== "YESTERDAY" && !isoDateRegex.test(options.businessDate)) {
      throw new AppError("BAD_REQUEST", "Invalid businessDate parameter format. Use TODAY, YESTERDAY, or YYYY-MM-DD");
    }

    const today = new Date();
    if (options.businessDate === "TODAY") {
      const todayStr = today.toISOString().split("T")[0];
      startDate = todayStr;
      endDate = todayStr;
    } else if (options.businessDate === "YESTERDAY") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      startDate = yesterdayStr;
      endDate = yesterdayStr;
    } else {
      startDate = options.businessDate;
      endDate = options.businessDate;
    }
  }

  // Date Filters (Filtering by businessDate column instead of createdAt for Accounting consistency)
  if (startDate || endDate) {
    where.businessDate = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.businessDate.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.businessDate.lte = end;
    }
  }

  // Search Filter (displayNumber, customerName, table name, product name, product SKU)
  if (options.search) {
    const s = options.search.trim();
    where.OR = [
      { displayNumber: { contains: s, mode: "insensitive" } },
      { customerName: { contains: s, mode: "insensitive" } },
      { table: { name: { contains: s, mode: "insensitive" } } },
      {
        items: {
          some: {
            OR: [
              { productName: { contains: s, mode: "insensitive" } },
              { productSku: { contains: s, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  // Sort Validations (Whitelist)
  const validSortBy = ["createdAt", "displayNumber", "grandTotal", "businessDate"].includes(
    options.sortBy || ""
  )
    ? (options.sortBy as string)
    : "businessDate";

  const validSortOrder = ["asc", "desc"].includes(options.sortOrder || "")
    ? (options.sortOrder as "asc" | "desc")
    : "desc";

  // Concurrent aggregation query via Promise.all
  const [orders, totalItems] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        payments: {
          include: {
            confirmedBy: {
              select: { id: true, fullName: true, username: true, role: true },
            },
          },
        },
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
      orderBy: { [validSortBy]: validSortOrder },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
};
