import { baseApi } from "./baseApi";
import { CreateCategoryInput, UpdateCategoryInput } from "@shared/types";

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<any[], { sellable?: boolean } | void>({
      query: (params) => ({
        url: "/categories",
        params: params || {},
      }),
      providesTags: ["Category"],
    }),
    getCategory: builder.query<any, string>({
      query: (id) => `/categories/${id}`,
      providesTags: (result, error, id) => [{ type: "Category", id }],
    }),
    createCategory: builder.mutation<any, CreateCategoryInput>({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Category"],
    }),
    updateCategory: builder.mutation<any, { id: string; body: UpdateCategoryInput }>({
      query: ({ id, body }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Category", { type: "Category", id }],
    }),
    deleteCategory: builder.mutation<any, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Category"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
