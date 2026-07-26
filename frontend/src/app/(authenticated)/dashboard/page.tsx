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

export default function DashboardPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const { stats, isLoading, isError, refetch } = useDashboard();

  // Get current hour for a contextual greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-center shadow-lg max-w-md mx-auto mt-12 gap-4">
        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">
          ⚠️
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-zinc-200 font-bold text-lg">Unable to load dashboard</h2>
          <p className="text-zinc-500 text-sm">Please check your network connection and try again.</p>
        </div>
        <Button variant="primary" onClick={refetch}>
          Retry Connection
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
            {getGreeting()}, {currentUser?.fullName || "Admin"}
          </h1>
          <p className="text-zinc-500 text-sm">
            Here is today's operations overview for the concessions terminal.
          </p>
        </div>
        <Button variant="secondary" onClick={refetch} isLoading={isLoading}>
          Refresh Stats
        </Button>
      </div>

      {/* Operational Summary Section */}
      <DashboardSection title="Today's Business Summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <DashboardStatCard
            title="Revenue Today"
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
            title="Orders Today"
            value={stats.todayOrders}
            color="text-zinc-100"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2" />
              </svg>
            }
          />
          <DashboardStatCard
            title="Preparing"
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
            title="Ready"
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
            title="Completed"
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
      <DashboardSection title="Payment Breakdowns">
        <PaymentSummaryCard
          cashAmount={stats.cashRevenue}
          qrisAmount={stats.qrisRevenue}
          loading={isLoading}
        />
      </DashboardSection>

      {/* Recent Activity Table */}
      <DashboardSection title="Today's Orders List">
        <RecentOrdersTable orders={stats.recentOrders} loading={isLoading} />
      </DashboardSection>
    </div>
  );
}
