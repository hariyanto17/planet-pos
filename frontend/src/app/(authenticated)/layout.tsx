"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { logout, updateUser } from "@/lib/store/features/auth/slice";
import { selectCurrentUser, selectIsAuthenticated } from "@/lib/store/features/auth/selectors";
import { toggleSidebar } from "@/lib/store/features/ui/slice";
import { selectSidebarOpen } from "@/lib/store/features/ui/selectors";
import { authCookie } from "@/utils/authCookie";
import { baseApi } from "@/lib/api/baseApi";
import { useGetMeQuery } from "@/lib/api/authApi";
import {
  ROLE_WORKSPACES,
  WORKSPACE_DEFAULT_ROUTES,
  SIDEBAR_CONFIGS,
  DEFAULT_WORKSPACE,
  getActiveWorkspaceByPath,
  isRouteAllowed,
  handleWorkspaceRedirect,
  WorkspaceType,
} from "@/lib/routes";
import { TEXT } from "@/lib/i18n/id";

// High-end Animated Splash Screen displayed during session restoration
const SplashRestoration = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-center px-4 animate-fade-in">
    <div className="flex flex-col items-center gap-6 max-w-sm">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 border-r-2 border-r-transparent animate-spin" />
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
          P
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">{TEXT.auth.loginTitle}</h2>
        <p className="text-zinc-500 text-xs tracking-wider uppercase animate-pulse">{TEXT.auth.restoringSession}</p>
      </div>
    </div>
  </div>
);

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);

  // Fetch/verify active profile from backend
  const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Sync profile to Redux store
  useEffect(() => {
    if (profile) {
      dispatch(updateUser(profile));
    }
  }, [profile, dispatch]);

  // Reactive redirect when token is missing
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Data-driven route guards & workspace landing redirects
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const role = currentUser.role;
    const redirectPath = handleWorkspaceRedirect(role, pathname);

    if (redirectPath) {
      router.replace(redirectPath);
    } else if (!isRouteAllowed(role, pathname)) {
      router.replace("/access-denied");
    }
  }, [pathname, currentUser, isAuthenticated, router]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
    authCookie.clearToken();
  };

  // 1. Token Missing: render nothing (redirecting to login)
  if (!isAuthenticated) {
    return null;
  }

  // 2. Profile Error: provide clear recovery interface instead of infinite loading
  if (isProfileError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-center px-4 gap-4 animate-fade-in">
        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">
          ⚠️
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-zinc-200 font-bold text-lg">{TEXT.auth.profileFailed}</h2>
          <p className="text-zinc-500 text-sm">{TEXT.auth.profileFailedDesc}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition text-xs font-semibold"
        >
          {TEXT.auth.signOut} & Re-login
        </button>
      </div>
    );
  }

  // 3. Hydration check: Show Splash Screen during profile verification & store sync
  const isRestoringSession = isProfileLoading || !currentUser;
  if (isRestoringSession) {
    return <SplashRestoration />;
  }

  // 4. Synchronous Route Authorization Protection (Render-Blocking)
  const role = currentUser.role;
  const isAllowed = isRouteAllowed(role, pathname);
  const isRedirecting = pathname === "/" || pathname === "/dashboard" ? (role !== "ADMIN") : false;

  if (!isAllowed || isRedirecting) {
    return (
      <div className="flex h-screen bg-zinc-950 items-center justify-center">
        <div className="animate-pulse text-zinc-500 text-sm">{TEXT.auth.loadingWorkspace}</div>
      </div>
    );
  }

  // Determine active workspace and load sidebar configurations
  const activeWorkspace = getActiveWorkspaceByPath(pathname) || DEFAULT_WORKSPACE[role];
  const sidebarItems = SIDEBAR_CONFIGS[activeWorkspace] || [];
  const allowedWorkspaces = ROLE_WORKSPACES[role] || [];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "dashboard":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
        );
      case "orders":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case "kitchen":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case "products":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "categories":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case "promotions":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0H4M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
          </svg>
        );
      case "tables":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "inventory":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case "reports":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "users":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case "shifts":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300`}
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            P
          </div>
          {sidebarOpen ? <span className="font-bold text-zinc-100 tracking-tight">Concessions</span> : null}
        </div>

        {/* Workspace Switcher Component for multi-workspace roles */}
        {allowedWorkspaces.length > 1 && (
          <div className="px-3 py-4 border-b border-zinc-800/80 flex flex-col gap-1.5">
            {sidebarOpen ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3">
                {TEXT.auth.switchWorkspace}
              </span>
            ) : null}
            <div className="flex flex-col gap-1">
              {allowedWorkspaces.map((ws) => {
                const isCurrent = activeWorkspace === ws;
                const targetRoute = WORKSPACE_DEFAULT_ROUTES[ws];
                return (
                  <Link
                    key={ws}
                    href={targetRoute}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition duration-200 ${
                      isCurrent
                        ? "bg-zinc-850 text-indigo-400 border border-zinc-800"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    <span>💼</span>
                    {sidebarOpen ? (
                      <span>
                        {ws === "ADMIN" ? TEXT.auth.panelAdmin : ws === "WAREHOUSE" ? TEXT.auth.panelWarehouse : `${ws} Panel`}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Config-driven Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition duration-200 ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {getIcon(item.iconName)}
                {sidebarOpen ? <span>{item.name}</span> : null}
              </Link>
            );
          })}
        </nav>

        {sidebarOpen && currentUser ? (
          <div className="p-4 border-t border-zinc-800 flex flex-col gap-2">
            <Link href="/profile" className="flex items-center gap-3 hover:opacity-85 transition">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                {(currentUser.fullName || currentUser.username || "?").charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-zinc-200 truncate">
                  {currentUser.fullName || currentUser.username}
                </span>
                <span className="text-xs text-zinc-500 truncate capitalize">{currentUser.role}</span>
              </div>
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition duration-200"
            >
              {TEXT.auth.signOut}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-zinc-950">{children}</main>
      </div>
    </div>
  );
}
