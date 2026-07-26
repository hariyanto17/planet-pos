import { baseApi } from "./baseApi";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<any[], void>({
      query: () => "/users",
      providesTags: ["User"],
    }),
  }),
});

export const { useGetUsersQuery } = userApi;
