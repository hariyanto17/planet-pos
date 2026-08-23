import { baseApi } from "./baseApi";
import { AppSettings } from "@shared/types";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppSettings: builder.query<AppSettings, void>({
      query: () => "/settings/application",
      providesTags: ["Settings"],
    }),
  }),
});

export const {
  useGetAppSettingsQuery,
} = settingsApi;
