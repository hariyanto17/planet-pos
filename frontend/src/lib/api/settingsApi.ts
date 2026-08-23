import { baseApi } from "./baseApi";
import { AppSettings } from "@shared/types";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppSettings: builder.query<AppSettings, void>({
      query: () => "/settings/application",
      providesTags: ["Settings"],
    }),
    updateAppSettings: builder.mutation<AppSettings, Partial<AppSettings>>({
      query: (body) => ({
        url: "/settings/application",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const {
  useGetAppSettingsQuery,
  useUpdateAppSettingsMutation,
} = settingsApi;
