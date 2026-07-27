import { baseApi } from "./baseApi";

export const unitsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnitsList: builder.query<
      any,
      { search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }
    >({
      query: (params) => ({
        url: "/units",
        params,
      }),
      providesTags: ["Unit"],
    }),
    getUnit: builder.query<any, string>({
      query: (id) => `/units/${id}`,
      providesTags: (result, error, id) => [{ type: "Unit", id }],
    }),
    createUnit: builder.mutation<any, { name: string; symbol: string }>({
      query: (body) => ({
        url: "/units",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Unit", "Inventory"],
    }),
    updateUnit: builder.mutation<any, { id: string; body: { name?: string; symbol?: string; isActive?: boolean } }>({
      query: ({ id, body }) => ({
        url: `/units/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Unit", { type: "Unit", id }, "Inventory"],
    }),
    deactivateUnit: builder.mutation<any, string>({
      query: (id) => ({
        url: `/units/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Unit", "Inventory"],
    }),
  }),
});

export const {
  useGetUnitsListQuery,
  useGetUnitQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeactivateUnitMutation,
} = unitsApi;
