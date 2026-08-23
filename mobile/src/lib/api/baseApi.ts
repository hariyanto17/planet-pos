import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { logout } from "../store/features/auth/slice";
import { RootState } from "../store/store";
import { Platform } from "react-native";

const baseUrl = __DEV__
  ? (Platform.OS === "android" ? "http://10.0.2.2:5050/api" : "http://localhost:5050/api")
  : "https://be-concession.168billiard.online/api";

const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

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
