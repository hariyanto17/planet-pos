"use client";

import React from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useGetInventorySummaryQuery } from "@/lib/api/inventoryApi";
import { DashboardStatCard } from "@/features/dashboard/components/DashboardStatCard";
import { DashboardSection } from "@/features/dashboard/components/DashboardSection";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/utils/formatters";
import Link from "next/link";
import { TEXT } from "@/lib/i18n/id";

export default function WarehouseDashboardPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const { data: summary, isLoading, isError, refetch } = useGetInventorySummaryQuery();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return TEXT.dashboard.greetingMorning;
    if (hour < 17) return TEXT.dashboard.greetingAfternoon;
    return TEXT.dashboard.greetingEvening;
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-center shadow-lg max-w-md mx-auto mt-12 gap-4">
        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">
          ⚠️
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-zinc-200 font-bold text-lg">{TEXT.dashboard.failedLoad}</h2>
          <p className="text-zinc-500 text-sm">{TEXT.dashboard.failedLoadDesc}</p>
        </div>
        <Button variant="primary" onClick={refetch}>
          {TEXT.dashboard.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto px-4 py-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            {getGreeting()}, {currentUser?.fullName || "Warehouse Manager"}
          </h1>
          <p className="text-zinc-500 text-sm">
            {TEXT.warehouse.dashboardSubtitle}
          </p>
        </div>
        <Button variant="secondary" onClick={refetch} isLoading={isLoading}>
          {TEXT.common.refresh}
        </Button>
      </div>

      {/* Stats Summary Section */}
      <DashboardSection title={TEXT.warehouse.overviewSectionTitle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardStatCard
            title={TEXT.inventory.valuationCard}
            value={formatCurrency(summary?.inventoryValue || 0)}
            color="text-indigo-400"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" />
              </svg>
            }
          />
          <DashboardStatCard
            title={TEXT.inventory.lowStockCard}
            value={summary?.lowStockProducts || 0}
            color={summary?.lowStockProducts > 0 ? "text-amber-500 font-extrabold animate-pulse" : "text-zinc-300"}
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <DashboardStatCard
            title={TEXT.inventory.outOfStockCard}
            value={summary?.outOfStockProducts || 0}
            color={summary?.outOfStockProducts > 0 ? "text-rose-500 font-extrabold animate-pulse" : "text-zinc-300"}
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
          />
          <DashboardStatCard
            title={TEXT.inventory.movementsCard}
            value={summary?.todayMovements || 0}
            color="text-emerald-500"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          />
        </div>
      </DashboardSection>

      {/* Quick Actions / Navigation link */}
      <DashboardSection title={TEXT.warehouse.quickAccessCardTitle}>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow animate-fade-in">
          <div className="flex flex-col gap-1">
            <h3 className="text-zinc-200 font-bold text-base">{TEXT.warehouse.quickAccessCardTitle}</h3>
            <p className="text-zinc-500 text-xs">
              {TEXT.warehouse.quickAccessCardDesc}
            </p>
          </div>
          <Link href="/warehouse/current-stock">
            <Button variant="primary">{TEXT.warehouse.quickAccessBtn}</Button>
          </Link>
        </div>
      </DashboardSection>
    </div>
  );
}
