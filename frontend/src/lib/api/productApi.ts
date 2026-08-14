import { baseApi } from "./baseApi";
import {
  CreateProductInput,
  UpdateProductInput,
  CreateSellableProductInput,
  UpdateSellableProductInput,
} from "@shared/types";

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<any[], { sellable?: boolean } | void>({
      query: (params) => ({
        url: "/products",
        params: params ? { sellable: params.sellable } : undefined,
      }),
      providesTags: ["Product"],
    }),
    getProduct: builder.query<any, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
    createProduct: builder.mutation<any, CreateSellableProductInput | CreateProductInput>({
      query: (body) => ({
        url: "/products",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Product"],
    }),
    updateProduct: builder.mutation<any, { id: string; body: UpdateSellableProductInput | UpdateProductInput }>({
      query: ({ id, body }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Product", { type: "Product", id }],
    }),
    deleteProduct: builder.mutation<any, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Product"],
    }),
    getProductRecipe: builder.query<any, string>({
      query: (id) => `/products/${id}/recipe`,
      providesTags: (result, error, id) => [{ type: "Product", id: `${id}-recipe` }],
    }),
    updateProductRecipe: builder.mutation<any, { id: string; body: { items: any[] } }>({
      query: ({ id, body }) => ({
        url: `/products/${id}/recipe`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Product",
        { type: "Product", id },
        { type: "Product", id: `${id}-recipe` },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetProductRecipeQuery,
  useUpdateProductRecipeMutation,
} = productApi;
