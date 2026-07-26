import { baseApi } from "./baseApi";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<any, void>({
      query: () => "/dashboard",
      providesTags: ["Order", "Payment"],
    }),
  }),
  overrideExisting: true,
});

export const { useGetDashboardStatsQuery } = dashboardApi;
export default dashboardApi;
