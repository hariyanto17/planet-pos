import { prisma } from "../../../utils/prisma";

export interface ProductReportOptions {
  page?: number;
  limit?: number;
  startDate: Date;
  endDate: Date;
  categoryId?: string;
}

export const queryProductSalesReport = async (options: ProductReportOptions) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const offset = (page - 1) * limit;

  let categoryName: string | null = null;
  if (options.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: options.categoryId },
    });
    categoryName = category ? category.name : null;
  }

  const countQuery: any[] = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT oi."productId") as "totalCount"
    FROM "OrderItem" oi
    WHERE oi."createdAt" >= ${options.startDate}
      AND oi."createdAt" <= ${options.endDate}
      AND (${categoryName}::text IS NULL OR oi."productCategory" = ${categoryName})
  `;
  const totalItems = Number(countQuery[0]?.totalCount || 0);

  const result: any[] = await prisma.$queryRaw`
    SELECT 
      oi."productId",
      oi."productName",
      oi."productSku" as "sku",
      oi."productCategory" as "category",
      SUM(oi.quantity) as "quantitySold",
      SUM(oi.subtotal) as "revenue",
      COUNT(DISTINCT oi."orderId") as "orderCount"
    FROM "OrderItem" oi
    WHERE oi."createdAt" >= ${options.startDate}
      AND oi."createdAt" <= ${options.endDate}
      AND (${categoryName}::text IS NULL OR oi."productCategory" = ${categoryName})
    GROUP BY oi."productId", oi."productName", oi."productSku", oi."productCategory"
    ORDER BY "quantitySold" DESC, "revenue" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalPages = Math.ceil(totalItems / limit);

  const formattedData = result.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    sku: row.sku || "",
    category: row.category || "Uncategorized",
    quantitySold: Number(row.quantitySold),
    revenue: Number(row.revenue),
    orderCount: Number(row.orderCount),
  }));

  return {
    data: formattedData,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
};
