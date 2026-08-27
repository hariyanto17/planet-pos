"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useLoginMutation } from "@/lib/api/authApi";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setCredentials } from "@/lib/store/features/auth/slice";
import { selectIsAuthenticated, selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { Input } from "@/components/Input";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";
import { authCookie } from "@/utils/authCookie";
import { getDefaultRouteByRole } from "@/lib/routes";
import { useToast } from "@/components/ToastProvider";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

const loginSchema = zod.object({
  username: zod.string().min(1, "Username is required"),
  password: zod.string().min(1, "Password is required"),
});

type LoginSchemaInput = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { text, locale } = useTranslation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);
  const [login, { isLoading, error: apiError }] = useLoginMutation();

  // Reactive redirect based on authentication state
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const targetRoute = getDefaultRouteByRole(currentUser.role);
      router.replace(targetRoute);
    }
  }, [isAuthenticated, currentUser, router]);

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
    } catch (err: any) {
      console.error("Login failed:", err);
      const message = getErrorMessage(err);
      toast.error(message);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return "";
    if (
      error.status === "FETCH_ERROR" ||
      error.error?.includes("Failed to fetch") ||
      error.message?.includes("Failed to fetch")
    ) {
      return locale === "id" ? "Tidak dapat terhubung ke server. Silakan coba lagi." : "Unable to connect to server. Please try again.";
    }
    if ("data" in error) {
      const serverMsg = (error.data as any)?.message;
      if (serverMsg === "Invalid username or password" || serverMsg === "Invalid credentials") {
        return locale === "id" ? "Username atau password salah." : "Invalid username or password.";
      }
      return serverMsg || text.auth.loginFailed;
    }
    return locale === "id" ? "Terjadi kesalahan. Silakan coba lagi." : "An error occurred. Please try again.";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-xl flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">{text.auth.loginTitle}</h2>
          <p className="text-text-secondary text-sm">{text.auth.loginSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label={text.auth.usernameLabel}
            placeholder={text.auth.usernamePlaceholder}
            error={errors.username?.message}
            {...register("username")}
          />

          <PasswordInput
            label={text.auth.passwordLabel}
            placeholder={text.auth.passwordPlaceholder}
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" isLoading={isLoading} className="w-full py-2.5 mt-2">
            {isLoading ? (locale === "id" ? "Memproses..." : "Processing...") : text.auth.loginButton}
          </Button>
        </form>
      </div>
    </div>
  );
}
