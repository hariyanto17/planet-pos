"use client";

import React from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { DashboardStatCard } from "@/features/dashboard/components/DashboardStatCard";
import { PaymentSummaryCard } from "@/features/dashboard/components/PaymentSummaryCard";
import { RecentOrdersTable } from "@/features/dashboard/components/RecentOrdersTable";
import { DashboardSection } from "@/features/dashboard/components/DashboardSection";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/utils/formatters";
import { TEXT } from "@/lib/i18n/id";

export default function DashboardPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const { stats, isLoading, isError, refetch } = useDashboard();

  // Get current hour for a contextual greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return TEXT.dashboard.greetingMorning;
    if (hour < 17) return TEXT.dashboard.greetingAfternoon;
    return TEXT.dashboard.greetingEvening;
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-2xl text-center shadow-lg max-w-md mx-auto mt-12 gap-4">
        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">
          ⚠️
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-text-primary font-bold text-lg">{TEXT.dashboard.failedLoad}</h2>
          <p className="text-text-muted text-sm">{TEXT.dashboard.failedLoadDesc}</p>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-text-primary">
            {getGreeting()}, {currentUser?.fullName || "Admin"}
          </h1>
          <p className="text-text-muted text-sm">
            {TEXT.dashboard.overviewSubtitle}
          </p>
        </div>
        <Button variant="secondary" onClick={refetch} isLoading={isLoading}>
          {TEXT.common.refresh}
        </Button>
      </div>

      {/* Operational Summary Section */}
      <DashboardSection title={TEXT.dashboard.statsTitle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <DashboardStatCard
            title={TEXT.dashboard.revenueToday}
            value={formatCurrency(stats.todayRevenue)}
            color="text-indigo-400"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" />
              </svg>
            }
          />
          <DashboardStatCard
            title={TEXT.dashboard.ordersToday}
            value={stats.todayOrders}
            color="text-text-primary"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2" />
              </svg>
            }
          />
          <DashboardStatCard
            title={TEXT.dashboard.preparing}
            value={stats.preparingOrders}
            color="text-amber-500"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          />
          <DashboardStatCard
            title={TEXT.dashboard.ready}
            value={stats.readyOrders}
            color="text-indigo-400"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <DashboardStatCard
            title={TEXT.dashboard.completed}
            value={stats.completedOrders}
            color="text-emerald-500"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </DashboardSection>

      {/* Payment Summary */}
      <DashboardSection title={TEXT.dashboard.paymentBreakdowns}>
        <PaymentSummaryCard
          cashAmount={stats.cashRevenue}
          qrisAmount={stats.qrisRevenue}
          loading={isLoading}
        />
      </DashboardSection>

      {/* Recent Activity Table */}
      <DashboardSection title={TEXT.dashboard.recentOrdersTitle}>
        <RecentOrdersTable orders={stats.recentOrders} loading={isLoading} />
      </DashboardSection>
    </div>
  );
}
