import { baseApi } from "./baseApi";
import { LoginInput, LoginResult } from "@shared/types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResult, LoginInput>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    getMe: builder.query<any, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),
    changePassword: builder.mutation<any, any>({
      query: (data) => ({
        url: "/auth/change-password",
        method: "POST",
        body: data,
      }),
    }),
    ssoLogin: builder.mutation<LoginResult, { code: string }>({
      query: (body) => ({
        url: "/auth/sso",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery, useChangePasswordMutation, useSsoLoginMutation } = authApi;
