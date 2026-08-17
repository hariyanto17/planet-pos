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
    getBrands: builder.query<any[], void>({
      query: () => "/brands",
      providesTags: ["Brand"],
    }),
    createBrand: builder.mutation<any, { name: string; isActive?: boolean }>({
      query: (body) => ({
        url: "/brands",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Brand"],
    }),
    getMaterials: builder.query<any[], void>({
      query: () => "/materials",
      providesTags: ["Material"],
    }),
    getMaterialVariants: builder.query<any[], void>({
      query: () => "/materials/variants",
      providesTags: ["MaterialVariant"],
    }),
    createMaterial: builder.mutation<any, any>({
      query: (body) => ({
        url: "/materials",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Material", "MaterialVariant", "Product"],
    }),
    updateMaterial: builder.mutation<any, { id: string; name: string; categoryId: string; brandId?: string; description?: string; isActive?: boolean; variant?: any }>({
      query: ({ id, ...body }) => ({
        url: `/materials/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Material", "MaterialVariant", "Product"],
    }),
    createMaterialVariant: builder.mutation<any, { materialId: string; body: any }>({
      query: ({ materialId, body }) => ({
        url: `/materials/${materialId}/variants`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { materialId }) => ["Material", "MaterialVariant", "Product", { type: "Product", id: materialId }],
    }),
    updateMaterialVariant: builder.mutation<any, { id: string; materialId: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/materials/variants/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { materialId }) => ["Material", "MaterialVariant", "Product", { type: "Product", id: materialId }],
    }),
    deleteMaterialVariant: builder.mutation<any, { id: string; materialId: string }>({
      query: ({ id }) => ({
        url: `/materials/variants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { materialId }) => ["Material", "MaterialVariant", "Product", { type: "Product", id: materialId }],
    }),
    getSupplierOffersByVariant: builder.query<any[], string>({
      query: (variantId) => `/materials/variants/${variantId}/supplier-offers`,
      providesTags: (result, error, variantId) => [{ type: "MaterialVariant", id: `offers-${variantId}` }],
    }),
    createSupplierOffer: builder.mutation<any, { variantId: string; materialId: string; body: any }>({
      query: ({ variantId, body }) => ({
        url: `/materials/variants/${variantId}/supplier-offers`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { variantId, materialId }) => [
        "Material", "MaterialVariant", "Product",
        { type: "Product", id: materialId },
        { type: "MaterialVariant", id: `offers-${variantId}` }
      ],
    }),
    deleteSupplierOffer: builder.mutation<any, { id: string; variantId: string; materialId: string }>({
      query: ({ id }) => ({
        url: `/materials/supplier-offers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { variantId, materialId }) => [
        "Material", "MaterialVariant", "Product",
        { type: "Product", id: materialId },
        { type: "MaterialVariant", id: `offers-${variantId}` }
      ],
    }),
    getPackagingByVariant: builder.query<any[], string>({
      query: (variantId) => `/materials/variants/${variantId}/packaging`,
      providesTags: (result, error, variantId) => [{ type: "MaterialVariant", id: `pkg-${variantId}` }],
    }),
    createPackaging: builder.mutation<any, { variantId: string; materialId: string; body: any }>({
      query: ({ variantId, body }) => ({
        url: `/materials/variants/${variantId}/packaging`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { variantId, materialId }) => [
        "Material", "MaterialVariant", "Product",
        { type: "Product", id: materialId },
        { type: "MaterialVariant", id: `pkg-${variantId}` }
      ],
    }),
    updatePackagingConfiguration: builder.mutation<any, { id: string; variantId: string; materialId: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/materials/packaging-configurations/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { variantId, materialId }) => [
        "Material", "MaterialVariant", "Product",
        { type: "Product", id: materialId },
        { type: "MaterialVariant", id: `pkg-${variantId}` }
      ],
    }),
    createNewPackagingVersion: builder.mutation<any, { configId: string; variantId: string; materialId: string; body: any }>({
      query: ({ configId, body }) => ({
        url: `/materials/packaging-configurations/${configId}/versions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { variantId, materialId }) => [
        "Material", "MaterialVariant", "Product",
        { type: "Product", id: materialId },
        { type: "MaterialVariant", id: `pkg-${variantId}` }
      ],
    }),
    getSuppliers: builder.query<any[], void>({
      query: () => "/suppliers",
      providesTags: ["Supplier"],
    }),
    createSupplier: builder.mutation<any, { name: string; code?: string; isActive?: boolean }>({
      query: (body) => ({
        url: "/suppliers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),
    updateSupplier: builder.mutation<any, { id: string; name: string; code?: string; isActive?: boolean }>({
      query: ({ id, ...body }) => ({
        url: `/suppliers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Supplier", "Material", "MaterialVariant", "Product"],
    }),
    deleteSupplier: builder.mutation<any, string>({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
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
  useGetBrandsQuery,
  useCreateBrandMutation,
  useGetMaterialsQuery,
  useGetMaterialVariantsQuery,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useCreateMaterialVariantMutation,
  useUpdateMaterialVariantMutation,
  useDeleteMaterialVariantMutation,
  useGetSupplierOffersByVariantQuery,
  useCreateSupplierOfferMutation,
  useDeleteSupplierOfferMutation,
  useGetPackagingByVariantQuery,
  useCreatePackagingMutation,
  useUpdatePackagingConfigurationMutation,
  useCreateNewPackagingVersionMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = productApi;
