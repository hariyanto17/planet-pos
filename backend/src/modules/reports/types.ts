export interface ReportQuery {
  startDate: string;
  endDate: string;
}

export interface ProductReportQuery extends ReportQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
}
