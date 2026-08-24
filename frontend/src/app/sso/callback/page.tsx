"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSsoLoginMutation } from "@/lib/api/authApi";
import { useAppDispatch } from "@/lib/store/hooks";
import { setCredentials } from "@/lib/store/features/auth/slice";
import { authCookie } from "@/utils/authCookie";
import { getDefaultRouteByRole } from "@/lib/routes";

function SsoCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [ssoLogin] = useSsoLoginMutation();

  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      router.replace("/login");
      return;
    }

    const performSso = async () => {
      try {
        const result = await ssoLogin({ code }).unwrap();
        
        dispatch(setCredentials(result));
        authCookie.setToken(result.token);

        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const targetRoute = getDefaultRouteByRole(result.user.role);
        router.replace(targetRoute);
      } catch (err) {
        console.error("SSO Exchange failed", err);
        router.replace("/login");
      }
    };

    performSso();
  }, [code, ssoLogin, dispatch, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-t-2 border-primary border-r-2 border-r-transparent animate-spin" />
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/30">
            S
          </div>
        </div>
        <div className="flex flex-col gap-2 animate-pulse">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Authenticating...</h2>
          <p className="text-text-secondary text-xs tracking-wider uppercase">Redirecting you to dashboard</p>
        </div>
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
        <span className="text-xs font-semibold text-text-secondary animate-pulse uppercase">Memuat Sesi...</span>
      </div>
    }>
      <SsoCallbackInner />
    </Suspense>
  );
}
