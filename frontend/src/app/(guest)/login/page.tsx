"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useLoginMutation } from "@/lib/api/authApi";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setCredentials } from "@/lib/store/features/auth/slice";
import { selectIsAuthenticated } from "@/lib/store/features/auth/selectors";
import { Input } from "@/components/Input";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";
import { authCookie } from "@/utils/authCookie";

const loginSchema = zod.object({
  username: zod.string().min(1, "Username is required"),
  password: zod.string().min(1, "Password is required"),
});

type LoginSchemaInput = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [login, { isLoading, error: apiError }] = useLoginMutation();

  // Reactive redirect based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginSchemaInput) => {
    try {
      const result = await login(data).unwrap();
      
      // Update Redux state
      dispatch(setCredentials(result));

      // Save cookie using helper
      authCookie.setToken(result.token);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return "";
    if ("data" in error) {
      return (error.data as any)?.message || "Invalid login credentials";
    }
    return "Something went wrong. Please try again.";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Planet Concessions POS</h2>
          <p className="text-zinc-500 text-sm">Log in to your retail console</p>
        </div>

        {apiError ? (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
            {getErrorMessage(apiError)}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Username"
            placeholder="Enter username"
            error={errors.username?.message}
            {...register("username")}
          />
          
          <PasswordInput
            label="Password"
            placeholder="Enter password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" isLoading={isLoading} className="w-full py-2.5 mt-2">
            Log In
          </Button>
        </form>
      </div>
    </div>
  );
}
