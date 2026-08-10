"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigationItems = [
    { name: "Ringkasan & Sinkronisasi", href: "/reports" },
    { name: "Analisis Harian", href: "/reports/daily" },
    { name: "Analisis Bulanan", href: "/reports/monthly" },
    { name: "Log Audit", href: "/reports/audit" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6 animate-fade-in text-text-primary">
      {/* Header Section */}
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">Laporan & Analisis</h1>
          <p className="text-text-secondary text-sm mt-1">
            Pantau kinerja operasional, ringkasan transaksi harian dan bulanan, serta sinkronisasi kasir.
          </p>
        </div>

        {/* Secondary Reports Navigation */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-none">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-transparent hover:border-border"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Child Pages Content */}
      <div className="flex-1 bg-background">{children}</div>
    </div>
  );
}
