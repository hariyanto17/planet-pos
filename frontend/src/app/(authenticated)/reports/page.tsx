"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useReports } from "./hooks/useReports";
import {
  useGetReportSummaryQuery,
  useGetSalesReportQuery,
  useGetPaymentReportQuery,
  useGetReconciliationReportQuery,
  useGetProductReportQuery,
  useGetReportsShiftsQuery,
  useGetReportsCashiersQuery,
} from "@/lib/api/reportsApi";
import { ReportFilters } from "./components/ReportFilters";
import { SummaryCards } from "./components/SummaryCards";
import { PaymentBreakdown } from "./components/PaymentBreakdown";
import { SalesChart } from "./components/SalesChart";
import { ProductRankingTable } from "./components/ProductRankingTable";
import { ReportsShiftTable } from "./components/ReportsShiftTable";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/utils/formatters";
import { TEXT } from "@/lib/i18n/id";

type ActiveTab = "OVERVIEW" | "SALES" | "COLLECTION" | "RECONCILIATION" | "SHIFTS" | "PRODUCTS";

export default function ReportsPage() {
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState<ActiveTab>("OVERVIEW");
  const [productPage, setProductPage] = useState(1);
  
  const [shiftsPage, setShiftsPage] = useState(1);
  const [shiftsSort, setShiftsSort] = useState<{ sortBy: string; sortOrder: "asc" | "desc" }>({
    sortBy: "openedAt",
    sortOrder: "desc",
  });

  // Authorization Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const {
    filters,
    resolvedDates,
    updatePreset,
    updateCustomRange,
    updateCashierId,
    updateShiftStatus,
    updateDiffStatus,
  } = useReports();

  // Queries
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useGetReportSummaryQuery(resolvedDates, {
    skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
  });

  const {
    data: salesData,
    isLoading: isSalesLoading,
    isError: isSalesError,
    refetch: refetchSales,
  } = useGetSalesReportQuery(resolvedDates, {
    skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
  });

  const {
    data: paymentData,
    isLoading: isPaymentLoading,
    isError: isPaymentError,
    refetch: refetchPayment,
  } = useGetPaymentReportQuery(resolvedDates, {
    skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
  });

  const {
    data: reconciliationData,
    isLoading: isReconciliationLoading,
    isError: isReconciliationError,
    refetch: refetchReconciliation,
  } = useGetReconciliationReportQuery(resolvedDates, {
    skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
  });

  const {
    data: productData,
    isLoading: isProductLoading,
    isError: isProductError,
    refetch: refetchProduct,
  } = useGetProductReportQuery(
    { ...resolvedDates, page: productPage, limit: 10 },
    {
      skip: activeTab !== "PRODUCTS" || !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
    }
  );

  const { data: cashiers = [] } = useGetReportsCashiersQuery(undefined, {
    skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
  });

  const {
    data: shiftsData,
    isLoading: isShiftsLoading,
    isError: isShiftsError,
    refetch: refetchShifts,
  } = useGetReportsShiftsQuery(
    {
      page: shiftsPage,
      limit: 10,
      startDate: resolvedDates.startDate,
      endDate: resolvedDates.endDate,
      cashierId: filters.cashierId || undefined,
      shiftStatus: filters.shiftStatus || undefined,
      differenceStatus: filters.differenceStatus || undefined,
      sortBy: shiftsSort.sortBy,
      sortOrder: shiftsSort.sortOrder,
    },
    {
      skip: activeTab !== "SHIFTS" || !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
    }
  );

  if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
    return null;
  }

  const handleRetryAll = () => {
    refetchSummary();
    refetchSales();
    refetchPayment();
    refetchReconciliation();
    if (activeTab === "PRODUCTS") refetchProduct();
    if (activeTab === "SHIFTS") refetchShifts();
  };

  const handleShiftsSort = (field: string) => {
    setShiftsSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
    }));
    setShiftsPage(1);
  };

  const isAnyLoading =
    isSummaryLoading ||
    isSalesLoading ||
    isPaymentLoading ||
    isReconciliationLoading ||
    (activeTab === "PRODUCTS" && isProductLoading) ||
    (activeTab === "SHIFTS" && isShiftsLoading);

  const isAnyError =
    isSummaryError ||
    isSalesError ||
    isPaymentError ||
    isReconciliationError ||
    (activeTab === "PRODUCTS" && isProductError) ||
    (activeTab === "SHIFTS" && isShiftsError);

  const apiWarning = summaryData?.meta?.warning || reconciliationData?.meta?.warning;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">{TEXT.reports.title}</h1>
          <p className="text-zinc-500 text-sm">
            {TEXT.reports.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/reports/daily")}>
            Analisis Harian
          </Button>
          <Button variant="secondary" onClick={() => router.push("/reports/monthly")}>
            Analisis Bulanan
          </Button>
          <Button variant="secondary" onClick={() => router.push("/reports/audit")}>
            Log Audit
          </Button>
          <Button variant="primary" onClick={handleRetryAll} isLoading={isAnyLoading}>
            Sinkronisasi Buku Besar
          </Button>
        </div>

      </div>

      {/* Warning banner */}
      {apiWarning && (
        <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-3">
          <span className="text-sm">⚠️</span>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Peringatan Selisih Akuntansi</h4>
            <p className="text-red-300/80 text-xs font-medium">{apiWarning}</p>
          </div>
        </div>
      )}

      {/* Date Filtering Dropdowns Presets */}
      <ReportFilters
        filters={filters}
        onPresetChange={updatePreset}
        onCustomRangeChange={updateCustomRange}
        showShiftsFilters={activeTab === "SHIFTS"}
        cashiers={cashiers}
        onCashierChange={updateCashierId}
        onShiftStatusChange={updateShiftStatus}
        onDiffStatusChange={updateDiffStatus}
      />

      {/* Tab Select Navigation */}
      <div className="flex border-b border-zinc-800/80 gap-1 overflow-x-auto pb-px">
        {[
          { id: "OVERVIEW", label: "Ikhtisar Keuangan" },
          { id: "SALES", label: "Analisis Penjualan" },
          { id: "COLLECTION", label: "Penerimaan Pembayaran" },
          { id: "RECONCILIATION", label: "Log Rekonsiliasi" },
          { id: "SHIFTS", label: "Shift Kasir" },
          { id: "PRODUCTS", label: "Peringkat Produk" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition duration-150 ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error State retry card */}
      {isAnyError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-center shadow-lg max-w-md mx-auto mt-6 gap-4 animate-fade-in">
          <span className="text-xl">⚠️</span>
          <div className="flex flex-col gap-1">
            <h2 className="text-zinc-200 font-bold">Gagal menyusun laporan</h2>
            <p className="text-zinc-500 text-xs">Verifikasi koneksi database Anda dan batas rentang filter tanggal.</p>
          </div>
          <Button variant="primary" onClick={handleRetryAll}>
            Ulangi Sinkronisasi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Tab 1: Financial Overview */}
          {activeTab === "OVERVIEW" && (
            <div className="flex flex-col gap-6">
              <SummaryCards data={summaryData?.data} isLoading={isSummaryLoading} />
              <SalesChart data={salesData?.data} isLoading={isSalesLoading} />
            </div>
          )}

          {/* Tab 2: Sales Analysis */}
          {activeTab === "SALES" && (
            <div className="flex flex-col gap-6">
              <SalesChart data={salesData?.data} isLoading={isSalesLoading} />
            </div>
          )}

          {/* Tab 3: Payment Collection */}
          {activeTab === "COLLECTION" && (
            <div className="flex flex-col gap-6">
              <PaymentBreakdown
                paymentData={paymentData?.data}
                reconciliationData={reconciliationData?.data}
                isLoading={isPaymentLoading || isReconciliationLoading}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cash parameters summary */}
                <div className="p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Audit Penerimaan Kas</h3>
                  <div className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
                    <span className="text-zinc-500 text-xs font-bold uppercase">Estimasi Total Kas</span>
                    <span className="text-zinc-200 text-sm font-extrabold">
                      {formatCurrency((paymentData?.data?.cash?.paid || 0) + (paymentData?.data?.cash?.pending || 0))}
                    </span>
                  </div>
                  <div className="text-zinc-500 text-xs leading-relaxed font-medium">
                    Total ini mencocokkan mata uang yang diberikan kepada staf selama pengiriman fisik. Bandingkan isi laci fisik saat shift ditutup.
                  </div>
                </div>

                {/* QRIS parameters summary */}
                <div className="p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Penyelesaian Bank QRIS</h3>
                  <div className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
                    <span className="text-zinc-500 text-xs font-bold uppercase">Penyelesaian Digital Gateway</span>
                    <span className="text-indigo-400 text-sm font-extrabold">
                      {formatCurrency(paymentData?.data?.qris?.paid || 0)}
                    </span>
                  </div>
                  <div className="text-zinc-500 text-xs leading-relaxed font-medium">
                    Penerimaan ini mencerminkan pertanyaan bank yang diselesaikan dari pembayaran QR. Periksa silang daftar transaksi dengan rekening koran portal bank gateway pembayaran.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Reconciliation Log */}
          {activeTab === "RECONCILIATION" && (
            <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-md flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-wider">Ringkasan Buku Besar Rekonsiliasi</h3>
                <p className="text-zinc-500 text-xs">Bandingkan pendapatan yang diharapkan dari checkout pesanan dengan penerimaan LUNAS.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-1.5">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Ekspektasi Penjualan Pesanan</span>
                  <span className="text-zinc-200 text-2xl font-black">
                    {formatCurrency(reconciliationData?.data?.expectedRevenue || 0)}
                  </span>
                  <p className="text-zinc-600 text-xs mt-1">Jumlah subtotal/pajak dari checkout (DISIAPKAN, SIAP, SELESAI)</p>
                </div>

                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-1.5">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pendapatan Lunas Terkumpul</span>
                  <span className="text-emerald-400 text-2xl font-black">
                    {formatCurrency(reconciliationData?.data?.collectedRevenue || 0)}
                  </span>
                  <p className="text-zinc-600 text-xs mt-1">Jumlah pembayaran kas/QR yang ditandai LUNAS</p>
                </div>

                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-1.5">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Selisih Belum Terkumpul / Perbedaan</span>
                  <span className="text-rose-400 text-2xl font-black">
                    {formatCurrency(reconciliationData?.data?.outstandingAmount || 0)}
                  </span>
                  <p className="text-zinc-600 text-xs mt-1">Total ekspektasi penjualan dikurangi penerimaan lunas yang diselesaikan</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Cashier Shifts Operational Tracking */}
          {activeTab === "SHIFTS" && (
            <div className="flex flex-col gap-6">
              {/* Summary Cards representing backend aggregated stats */}
              <SummaryCards data={summaryData?.data} isLoading={isSummaryLoading} showShifts={true} />

              <ReportsShiftTable
                data={shiftsData}
                isLoading={isShiftsLoading}
                page={shiftsPage}
                limit={10}
                onPageChange={(p) => setShiftsPage(p)}
                sortBy={shiftsSort.sortBy}
                sortOrder={shiftsSort.sortOrder}
                onSortChange={handleShiftsSort}
                onRetry={refetchShifts}
                isError={isShiftsError}
              />
            </div>
          )}

          {/* Tab 6: Product Ranking */}
          {activeTab === "PRODUCTS" && (
            <div className="flex flex-col gap-6">
              <ProductRankingTable
                data={productData}
                isLoading={isProductLoading}
                page={productPage}
                limit={10}
                onPageChange={(p) => setProductPage(p)}
              />
            </div>
          )}

          {/* Audit Metadata Info */}
          {!isAnyLoading && (
            <div className="flex flex-wrap items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-t border-zinc-800/40 pt-4 mt-2 px-1">
              <span>Zona Waktu: {summaryData?.meta?.timezone || "UTC"}</span>
              <span>Dibuat Pada: {new Date(summaryData?.meta?.generatedAt || "").toLocaleString()}</span>
              <span>Mata Uang Dasar Laporan: {summaryData?.meta?.currency || "Rp"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
