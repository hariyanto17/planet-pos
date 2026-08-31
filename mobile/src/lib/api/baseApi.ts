import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { logout } from "../store/features/auth/slice";
import { RootState } from "../store/store";
import { Platform } from "react-native";

import { ENDPOINTS, getApiBaseUrl } from "../../config/endpoints";

const prepareHeaders = (headers: Headers, { getState }: any) => {
  const token = (getState() as RootState).auth.token;
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
};

const createBaseQuery = (baseUrl: string) =>
  fetchBaseQuery({
    baseUrl,
    prepareHeaders,
  });

const primaryBaseUrl = getApiBaseUrl();
const primaryBaseQuery = createBaseQuery(primaryBaseUrl);

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await primaryBaseQuery(args, api, extraOptions);

  const isNetworkFailure =
    result.error &&
    (result.error.status === "FETCH_ERROR" ||
      (typeof result.error.error === "string" && result.error.error.toLowerCase().includes("network request failed")));

  const shouldRetryLocal =
    isNetworkFailure &&
    primaryBaseUrl === ENDPOINTS.API_BASE_URL &&
    (Platform.OS === "android" || __DEV__);

  if (shouldRetryLocal) {
    const localBaseQuery = createBaseQuery(ENDPOINTS.LOCAL_API_BASE_URL);
    result = await localBaseQuery(args, api, extraOptions);
  }

  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
    api.dispatch(baseApi.util.resetApiState());
  }

  // Unwrap response data if it is wrapped in our custom API envelope
  if (result.data && typeof result.data === "object" && "data" in result.data) {
    return { ...result, data: (result.data as any).data };
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User", "Category", "Product", "Table", "Tax", "Promotion", "Order", "Payment", "Shifts", "Inventory", "Settings"],
  endpoints: () => ({}),
});
