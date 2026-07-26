import { baseApi } from "./baseApi";

export const shiftsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentShift: builder.query<any, void>({
      query: () => "/shifts/current",
      providesTags: ["Shifts"],
    }),
    openShift: builder.mutation<any, { openingCash: number }>({
      query: (body) => ({
        url: "/shifts/open",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Shifts"],
    }),
    getShiftReconciliation: builder.query<any, string>({
      query: (shiftId) => `/shifts/${shiftId}/reconciliation`,
      providesTags: ["Shifts"],
    }),
    closeShift: builder.mutation<any, { shiftId: string; actualCash: number; notes?: string }>({
      query: ({ shiftId, ...body }) => ({
        url: `/shifts/${shiftId}/close`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Shifts"],
    }),
  }),
});

export const {
  useGetCurrentShiftQuery,
  useOpenShiftMutation,
  useGetShiftReconciliationQuery,
  useCloseShiftMutation,
} = shiftsApi;
export default shiftsApi;
