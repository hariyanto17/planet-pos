import { baseApi } from "./baseApi";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<any, any>({
      query: (params) => ({
        url: "/users",
        params,
      }),
      providesTags: ["User"],
    }),
    createUser: builder.mutation<any, any>({
      query: (data) => ({
        url: "/users",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    updateUser: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    resetUserPassword: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/users/${id}/reset-password`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    updateUserStatus: builder.mutation<any, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/users/${id}/status`,
        method: "PATCH",
        body: { isActive },
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useResetUserPasswordMutation,
  useUpdateUserStatusMutation,
} = userApi;
