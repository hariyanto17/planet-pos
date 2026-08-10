import { baseApi } from "./baseApi";

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCashierShiftReport: builder.query<any, void>({
      query: () => "/reports/cashier-shift-report",
      providesTags: ["Shifts", "Order"],
    }),
  }),
});

export const { useGetCashierShiftReportQuery } = reportsApi;
