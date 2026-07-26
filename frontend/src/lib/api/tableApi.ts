import { baseApi } from "./baseApi";
import { CreateTableInput, UpdateTableInput } from "@shared/types";

export const tableApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTables: builder.query<any[], void>({
      query: () => "/tables",
      providesTags: ["Table"],
    }),
    getTable: builder.query<any, string>({
      query: (id) => `/tables/${id}`,
      providesTags: (result, error, id) => [{ type: "Table", id }],
    }),
    createTable: builder.mutation<any, CreateTableInput>({
      query: (body) => ({
        url: "/tables",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Table"],
    }),
    updateTable: builder.mutation<any, { id: string; body: UpdateTableInput }>({
      query: ({ id, body }) => ({
        url: `/tables/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Table", { type: "Table", id }],
    }),
    deleteTable: builder.mutation<any, string>({
      query: (id) => ({
        url: `/tables/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Table"],
    }),
  }),
});

export const {
  useGetTablesQuery,
  useGetTableQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} = tableApi;
