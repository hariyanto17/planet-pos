"use client";

import React from "react";
import Link from "next/link";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { getDefaultRouteByRole } from "@/lib/routes";
import { TEXT } from "@/lib/i18n/id";

export default function AccessDeniedPage() {
  const currentUser = useAppSelector(selectCurrentUser);

  const getHomeRoute = () => {
    if (!currentUser) return "/login";
    return getDefaultRouteByRole(currentUser.role);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-3xl font-bold animate-pulse">
          ⚠️
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">{TEXT.auth.accessDeniedTitle}</h1>
          <p className="text-zinc-400 text-sm">
            {TEXT.auth.accessDeniedDesc}
          </p>
        </div>
        <div className="w-full border-t border-zinc-800 my-2" />
        <Link
          href={getHomeRoute()}
          className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition duration-200 shadow-lg shadow-indigo-600/20 text-center"
        >
          {TEXT.auth.returnToWorkspace}
        </Link>
      </div>
    </div>
  );
}
