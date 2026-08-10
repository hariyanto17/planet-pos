"use client";

import React from "react";

import { TEXT } from "@/lib/i18n/id";

export default function PromotionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{TEXT.promotions.title}</h1>
        <p className="text-text-secondary text-sm">{TEXT.promotions.subtitle}</p>
      </div>
      <div className="p-12 border border-dashed border-border rounded-xl text-center text-text-muted">
        Antarmuka manajemen kampanye promosi (placeholder)
      </div>
    </div>
  );
}
