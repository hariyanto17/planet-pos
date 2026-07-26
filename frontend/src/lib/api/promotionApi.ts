import { baseApi } from "./baseApi";
import { CreatePromotionInput, UpdatePromotionInput } from "@shared/types";

export const promotionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPromotions: builder.query<any[], void>({
      query: () => "/promotions",
      providesTags: ["Promotion"],
    }),
    getPromotion: builder.query<any, string>({
      query: (id) => `/promotions/${id}`,
      providesTags: (result, error, id) => [{ type: "Promotion", id }],
    }),
    createPromotion: builder.mutation<any, CreatePromotionInput>({
      query: (body) => ({
        url: "/promotions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Promotion"],
    }),
    updatePromotion: builder.mutation<any, { id: string; body: UpdatePromotionInput }>({
      query: ({ id, body }) => ({
        url: `/promotions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Promotion", { type: "Promotion", id }],
    }),
    deletePromotion: builder.mutation<any, string>({
      query: (id) => ({
        url: `/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Promotion"],
    }),
  }),
});

export const {
  useGetPromotionsQuery,
  useGetPromotionQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
} = promotionApi;
