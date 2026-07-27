"use client";

import React from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { TEXT } from "@/lib/i18n/id";

export default function ProfilePage() {
  const currentUser = useAppSelector(selectCurrentUser);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{TEXT.profile.title}</h1>
        <p className="text-zinc-400 text-sm">{TEXT.profile.subtitle}</p>
      </div>

      {currentUser ? (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{TEXT.profile.fullName}</span>
            <span className="text-zinc-100 text-sm font-medium">{currentUser.fullName}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{TEXT.profile.username}</span>
            <span className="text-zinc-100 text-sm font-medium">{currentUser.username}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{TEXT.profile.role}</span>
            <span className="text-zinc-100 text-sm font-medium capitalize">{currentUser.role}</span>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-zinc-500 max-w-md">
          {TEXT.profile.noProfile}
        </div>
      )}
    </div>
  );
}
