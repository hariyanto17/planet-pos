"use client";

import React from "react";

export default function KitchenPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Kitchen Display System (KDS)</h1>
        <p className="text-text-secondary text-sm">Real-time concessions kitchen order preparation states queue.</p>
      </div>
      <div className="p-12 border border-dashed border-border rounded-xl text-center text-text-muted">
        Kitchen display board and preparing/ready queue tracker placeholder
      </div>
    </div>
  );
}
