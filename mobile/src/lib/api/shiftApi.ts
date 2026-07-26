import { baseApi } from "./baseApi";

export const shiftApi = baseApi.injectEndpoints({
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
    closeShift: builder.mutation<any, { id: string; body: { actualCash: number; notes?: string } }>({
      query: ({ id, body }) => ({
        url: `/shifts/${id}/close`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Shifts", "Order"],
    }),
  }),
});

export const { useGetCurrentShiftQuery, useOpenShiftMutation, useCloseShiftMutation } = shiftApi;
