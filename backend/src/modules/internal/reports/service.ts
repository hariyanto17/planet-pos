import { prisma } from "../../../utils/prisma";
import { ConcessionReportQueryInput } from "./validation";

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryName: string;
  quantitySold: number;
  grossRevenue: number;
  discountAmount: number;
  taxAmount: number;
  netRevenue: number;
  averageSellingPrice: number | null;
  revenueShare: number;
}

export interface ConcessionReportPaginationResult<T> {
  data: T[];
  summary: {
    totalItems: number;
    totalRevenue: number;
    totalQuantitySold: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getProductPerformanceReport = async (
  input: ConcessionReportQueryInput
): Promise<ConcessionReportPaginationResult<ProductPerformanceItem>> => {
  const start = new Date(input.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(input.endDate);
  end.setUTCHours(23, 59, 59, 999);

  // Find all order items from orders with at least one PAID payment within businessDate
  const orderWhere: any = {
    businessDate: { gte: start, lte: end },
    payments: {
      some: {
        status: "PAID",
      },
    },
  };

  if (input.cashierId) {
    orderWhere.cashierId = input.cashierId;
  }

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: orderWhere,
      ...(input.productId ? { sellableProductId: input.productId } : {}),
      ...(input.categoryId ? {
        OR: [
          { productCategory: input.categoryId },
          {
            sellableProduct: {
              categoryId: input.categoryId,
            },
          },
        ],
      } : {}),
    },
    include: {
      order: {
        select: {
          taxAmount: true,
          subtotal: true,
        },
      },
      sellableProduct: {
        select: {
          categoryId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const productMap = new Map<string, {
    productId: string;
    productName: string;
    categoryId: string | null;
    categoryName: string;
    quantitySold: number;
    grossRevenue: number;
    discountAmount: number;
    taxAmount: number;
  }>();

  for (const item of orderItems) {
    if (input.search) {
      const q = input.search.toLowerCase();
      const matchName = item.productName.toLowerCase().includes(q);
      const matchCat = (item.productCategory || item.sellableProduct?.category?.name || "").toLowerCase().includes(q);
      if (!matchName && !matchCat) continue;
    }

    const pId = item.sellableProductId;
    const catName = item.sellableProduct?.category?.name || item.productCategory || "Uncategorized";
    const catId = item.sellableProduct?.categoryId || null;

    const existing = productMap.get(pId) || {
      productId: pId,
      productName: item.productName,
      categoryId: catId,
      categoryName: catName,
      quantitySold: 0,
      grossRevenue: 0,
      discountAmount: 0,
      taxAmount: 0,
    };

    const qty = item.quantity;
    const gross = Number(item.subtotal);
    const disc = Number(item.discountAmount || 0);

    // Proportional order tax allocation
    const orderSubtotal = Number(item.order?.subtotal || 0);
    const orderTax = Number(item.order?.taxAmount || 0);
    const itemTax = orderSubtotal > 0 ? (gross / orderSubtotal) * orderTax : 0;

    existing.quantitySold += qty;
    existing.grossRevenue += gross;
    existing.discountAmount += disc;
    existing.taxAmount += itemTax;

    productMap.set(pId, existing);
  }

  let totalNetRevenue = 0;
  let totalQuantitySoldSum = 0;

  const rawList = Array.from(productMap.values()).map((p) => {
    const net = Math.max(0, p.grossRevenue - p.discountAmount + p.taxAmount);
    totalNetRevenue += net;
    totalQuantitySoldSum += p.quantitySold;
    return {
      ...p,
      grossRevenue: Number(p.grossRevenue.toFixed(2)),
      discountAmount: Number(p.discountAmount.toFixed(2)),
      taxAmount: Number(p.taxAmount.toFixed(2)),
      netRevenue: Number(net.toFixed(2)),
    };
  });

  const fullReport: ProductPerformanceItem[] = rawList
    .map((p) => {
      const avgPrice = p.quantitySold > 0 ? Number((p.netRevenue / p.quantitySold).toFixed(2)) : null;
      const share = totalNetRevenue > 0 ? Number(((p.netRevenue / totalNetRevenue) * 100).toFixed(2)) : 0;
      return {
        ...p,
        averageSellingPrice: avgPrice,
        revenueShare: share,
      };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue || b.quantitySold - a.quantitySold);

  // Pagination
  const page = input.page || 1;
  const limit = input.limit || 20;
  const skip = (page - 1) * limit;
  const paginatedData = fullReport.slice(skip, skip + limit);

  return {
    data: paginatedData,
    summary: {
      totalItems: fullReport.length,
      totalRevenue: Number(totalNetRevenue.toFixed(2)),
      totalQuantitySold: totalQuantitySoldSum,
    },
    pagination: {
      total: fullReport.length,
      page,
      limit,
      totalPages: Math.ceil(fullReport.length / limit) || 1,
    },
  };
};
