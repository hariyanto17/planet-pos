import { baseApi } from "./baseApi";

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReportSummary: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({
        url: "/reports/summary",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getSalesReport: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({
        url: "/reports/sales",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getPaymentReport: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({
        url: "/reports/payments",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getReconciliationReport: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({
        url: "/reports/reconciliation",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getProductReport: builder.query<
      any,
      { startDate: string; endDate: string; page?: number; limit?: number; categoryId?: string }
    >({
      query: (params) => ({
        url: "/reports/products",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getPaymentAudit: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({
        url: "/reports/audit/payments",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getOrderAudit: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({
        url: "/reports/audit/orders",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getAccountingSnapshot: builder.query<any, { businessDate: string }>({
      query: (params) => ({
        url: "/reports/snapshot",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getReportsShifts: builder.query<
      any,
      {
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
        cashierId?: string;
        shiftStatus?: string;
        differenceStatus?: string;
        sortBy?: string;
        sortOrder?: string;
      }
    >({
      query: (params) => ({
        url: "/reports/shifts",
        params,
      }),
      providesTags: ["Reports", "Shifts"],
    }),
    getReportsCashiers: builder.query<any[], void>({
      query: () => "/reports/cashiers",
      providesTags: ["Reports"],
    }),
    getDailyAnalysis: builder.query<any, { date: string }>({
      query: (params) => ({
        url: "/reports/daily-analysis",
        params,
      }),
      providesTags: ["Reports"],
    }),
    getMonthlyAnalysis: builder.query<any, { month: number; year: number }>({
      query: (params) => ({
        url: "/reports/monthly-analysis",
        params,
      }),
      providesTags: ["Reports"],
    }),
  }),
});

export const {
  useGetReportSummaryQuery,
  useGetSalesReportQuery,
  useGetPaymentReportQuery,
  useGetReconciliationReportQuery,
  useGetProductReportQuery,
  useGetPaymentAuditQuery,
  useGetOrderAuditQuery,
  useGetAccountingSnapshotQuery,
  useGetReportsShiftsQuery,
  useGetReportsCashiersQuery,
  useGetDailyAnalysisQuery,
  useGetMonthlyAnalysisQuery,
} = reportsApi;

