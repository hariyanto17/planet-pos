import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { logout } from "../store/features/auth/slice";
import { authCookie } from "../../utils/authCookie";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api",
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
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && api.endpoint !== "login") {
    // Perform state cleanup only
    api.dispatch(logout());
    api.dispatch(baseApi.util.resetApiState());
    authCookie.clearToken();
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
  tagTypes: ["User", "Category", "Product", "Table", "Tax", "Promotion", "Order", "Payment", "Reports", "Shifts", "Inventory", "Unit", "Warehouse"],
  endpoints: () => ({}),
});
