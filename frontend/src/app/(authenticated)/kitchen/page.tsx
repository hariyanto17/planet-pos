"use client";

import React from "react";

export default function KitchenPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Kitchen Display System (KDS)</h1>
        <p className="text-zinc-400 text-sm">Real-time concessions kitchen order preparation states queue.</p>
      </div>
      <div className="p-12 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
        Kitchen display board and preparing/ready queue tracker placeholder
      </div>
    </div>
  );
}
