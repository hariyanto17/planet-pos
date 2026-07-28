"use client";

import React from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import {
  useGetInventorySummaryQuery,
  useGetInventoryProductsQuery,
  useGetStockMovementsQuery,
} from "@/lib/api/inventoryApi";
import { DashboardStatCard } from "@/features/dashboard/components/DashboardStatCard";
import { DashboardSection } from "@/features/dashboard/components/DashboardSection";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/utils/formatters";
import Link from "next/link";
import { TEXT } from "@/lib/i18n/id";

export default function WarehouseDashboardPage() {
  const currentUser = useAppSelector(selectCurrentUser);

  // Parallel requests to avoid waterfalls
  const { data: summary, isLoading, isError, refetch } = useGetInventorySummaryQuery();

  const { data: lowStockData, isLoading: isLoadingLowStock, refetch: refetchLowStock } = useGetInventoryProductsQuery({
    stockStatus: "LOW_STOCK",
    limit: 10,
  });

  const { data: outOfStockData, isLoading: isLoadingOutOfStock, refetch: refetchOutOfStock } = useGetInventoryProductsQuery({
    stockStatus: "OUT_OF_STOCK",
    limit: 10,
  });

  const { data: movementsData, isLoading: isLoadingMovements, refetch: refetchMovements } = useGetStockMovementsQuery({
    limit: 10,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return TEXT.dashboard.greetingMorning;
    if (hour < 17) return TEXT.dashboard.greetingAfternoon;
    return TEXT.dashboard.greetingEvening;
  };

  const handleRefetchAll = () => {
    refetch();
    refetchLowStock();
    refetchOutOfStock();
    refetchMovements();
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
        <Button variant="primary" onClick={handleRefetchAll}>
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
        <Button variant="secondary" onClick={handleRefetchAll} isLoading={isLoading}>
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

      {/* Dashboard Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Stock Alert Lists */}
        <div className="flex flex-col gap-8">
          {/* Low Stock Widget */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-200 font-extrabold text-base flex items-center gap-2">
                ⚠️ Produk Minim Stok
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                Alert
              </span>
            </div>
            {isLoadingLowStock ? (
              <div className="text-zinc-500 text-xs py-4">Memuat data...</div>
            ) : (lowStockData?.data || []).length === 0 ? (
              <div className="text-zinc-500 text-xs py-4">Tidak ada produk minim stok.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {(lowStockData?.data || []).slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-xs py-2 border-b border-zinc-800/40 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-300">{p.name}</span>
                      <span className="text-[10px] text-zinc-500">SKU: {p.sku} | {p.warehouseName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-amber-500">{p.quantity}</span>
                      <span className="text-zinc-500 ml-1">/ {p.minimumStock} {p.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Out of Stock Widget */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-200 font-extrabold text-base flex items-center gap-2">
                🚫 Produk Habis (Out of Stock)
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                Empty
              </span>
            </div>
            {isLoadingOutOfStock ? (
              <div className="text-zinc-500 text-xs py-4">Memuat data...</div>
            ) : (outOfStockData?.data || []).length === 0 ? (
              <div className="text-zinc-500 text-xs py-4">Tidak ada produk habis stok.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {(outOfStockData?.data || []).slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-xs py-2 border-b border-zinc-800/40 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-300">{p.name}</span>
                      <span className="text-[10px] text-zinc-500">SKU: {p.sku} | {p.warehouseName}</span>
                    </div>
                    <div className="text-right font-extrabold text-rose-500">
                      Habis ({p.quantity} {p.unit})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Movements */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-zinc-200 font-extrabold text-base flex items-center gap-2">
              📋 Aktivitas Stok Terbaru
            </h3>
            <span className="text-xs text-zinc-500">10 Entri Terakhir</span>
          </div>
          {isLoadingMovements ? (
            <div className="text-zinc-500 text-xs py-4">Memuat data...</div>
          ) : (movementsData?.data || []).length === 0 ? (
            <div className="text-zinc-500 text-xs py-4">Belum ada aktivitas mutasi stok.</div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[420px] pr-1">
              {(movementsData?.data || []).map((m: any) => {
                const isPositive = m.quantity > 0;
                return (
                  <div key={m.id} className="flex justify-between items-center text-xs pb-3 border-b border-zinc-800/30 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-semibold text-zinc-200">{m.productName}</div>
                      <div className="text-[10px] text-zinc-500">
                        {m.warehouseName} | {m.createdBy} | {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </div>
                      {m.remarks && <div className="text-[9px] text-zinc-400 font-medium mt-0.5">Note: {m.remarks}</div>}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        m.movementType === "SALE" ? "bg-blue-500/10 text-blue-400" :
                        m.movementType === "OPENING" ? "bg-indigo-500/10 text-indigo-400" :
                        m.movementType === "RECEIVE" ? "bg-emerald-500/10 text-emerald-400" :
                        m.movementType === "ADJUSTMENT" ? (isPositive ? "bg-teal-500/10 text-teal-400" : "bg-orange-500/10 text-orange-400") :
                        "bg-rose-500/10 text-rose-400"
                      }`}>
                        {m.movementType}
                      </span>
                      <span className={`font-black ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                        {isPositive ? "+" : ""}{m.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
