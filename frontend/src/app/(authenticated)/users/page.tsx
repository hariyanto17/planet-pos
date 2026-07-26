"use client";

import React from "react";

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">User Accounts</h1>
        <p className="text-zinc-400 text-sm">Register cashiers, accounting officers, and kitchen staff credentials.</p>
      </div>
      <div className="p-12 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
        System staff accounts register management placeholder
      </div>
    </div>
  );
}
