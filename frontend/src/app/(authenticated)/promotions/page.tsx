"use client";

import React from "react";

import { TEXT } from "@/lib/i18n/id";

export default function PromotionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{TEXT.promotions.title}</h1>
        <p className="text-zinc-400 text-sm">{TEXT.promotions.subtitle}</p>
      </div>
      <div className="p-12 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
        Antarmuka manajemen kampanye promosi (placeholder)
      </div>
    </div>
  );
}
