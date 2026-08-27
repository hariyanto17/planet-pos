import { AppError } from "../../../utils/errorHandler";

export interface ConcessionReportQueryInput {
  startDate: string;
  endDate: string;
  compare?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  productId?: string;
  cashierId?: string;
}

export const validateConcessionReportQuery = (query: Record<string, any>): ConcessionReportQueryInput => {
  const { startDate, endDate, compare, page, limit, search, categoryId, productId, cashierId } = query;

  if (!startDate || typeof startDate !== "string") {
    throw new AppError("BAD_REQUEST", "startDate is required and must be in YYYY-MM-DD format");
  }

  if (!endDate || typeof endDate !== "string") {
    throw new AppError("BAD_REQUEST", "endDate is required and must be in YYYY-MM-DD format");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError("BAD_REQUEST", "Invalid date format. Expected YYYY-MM-DD");
  }

  if (start > end) {
    throw new AppError("BAD_REQUEST", "startDate cannot be after endDate");
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 366) {
    throw new AppError("BAD_REQUEST", "Date range cannot exceed 366 days");
  }

  let parsedPage = page ? parseInt(page.toString(), 10) : 1;
  if (isNaN(parsedPage) || parsedPage < 1) parsedPage = 1;

  let parsedLimit = limit ? parseInt(limit.toString(), 10) : 20;
  if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 20;
  if (parsedLimit > 100) parsedLimit = 100;

  return {
    startDate,
    endDate,
    compare: compare === "true" || compare === true,
    page: parsedPage,
    limit: parsedLimit,
    search: typeof search === "string" ? search.trim() : undefined,
    categoryId: typeof categoryId === "string" ? categoryId.trim() : undefined,
    productId: typeof productId === "string" ? productId.trim() : undefined,
    cashierId: typeof cashierId === "string" ? cashierId.trim() : undefined,
  };
};
