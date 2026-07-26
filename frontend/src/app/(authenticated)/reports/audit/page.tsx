"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useReports } from "../hooks/useReports";
import {
  useGetPaymentAuditQuery,
  useGetOrderAuditQuery,
  useGetAccountingSnapshotQuery,
} from "@/lib/api/reportsApi";
import { ReportFilters } from "../components/ReportFilters";
import { AuditSummaryCard } from "./components/AuditSummaryCard";
import { PaymentAuditTable } from "./components/PaymentAuditTable";
import { OrderIntegrityTable } from "./components/OrderIntegrityTable";
import { SnapshotCard } from "./components/SnapshotCard";
import { Button } from "@/components/Button";

export default function ReportsAuditPage() {
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [snapshotDate, setSnapshotDate] = useState(todayStr);

  // Authorization Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const { filters, resolvedDates, updatePreset, updateCustomRange } = useReports();

  // Queries
  const {
    data: paymentAudit,
    isLoading: isPaymentLoading,
    isError: isPaymentError,
    refetch: refetchPayment,
  } = useGetPaymentAuditQuery(resolvedDates, {
    skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
  });

  const {
    data: orderAudit,
    isLoading: isOrderLoading,
    isError: isOrderError,
    refetch: refetchOrder,
  } = useGetOrderAuditQuery(resolvedDates, {
    skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
  });

  const {
    data: snapshot,
    isLoading: isSnapshotLoading,
    isError: isSnapshotError,
    refetch: refetchSnapshot,
  } = useGetAccountingSnapshotQuery(
    { businessDate: snapshotDate },
    {
      skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
    }
  );

  if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
    return null;
  }

  const handleRetryAll = () => {
    refetchPayment();
    refetchOrder();
    refetchSnapshot();
  };

  const isAnyLoading = isPaymentLoading || isOrderLoading || isSnapshotLoading;
  const isAnyError = isPaymentError || isOrderError || isSnapshotError;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">Accounting Ledger Audit</h1>
          <p className="text-zinc-500 text-sm">
            Continuous reconciliation loops detecting missing payments, duplicate checkouts, and stuck kitchen processes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/reports")}>
            Reports Dashboard
          </Button>
          <Button variant="primary" onClick={handleRetryAll} isLoading={isAnyLoading}>
            Re-Audit Ledger
          </Button>
        </div>
      </div>

      {isAnyError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-center shadow-lg max-w-md mx-auto mt-6 gap-4">
          <span className="text-xl">⚠️</span>
          <div className="flex flex-col gap-1">
            <h2 className="text-zinc-200 font-bold">Failed to load audit checks</h2>
            <p className="text-zinc-500 text-xs">Verify database connectivity and filter properties.</p>
          </div>
          <Button variant="primary" onClick={handleRetryAll}>
            Retry Audit
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Health Status Indicator Banner */}
          <AuditSummaryCard
            invalidCompletedCount={orderAudit?.data?.invalidCompletedOrders?.length || 0}
            stuckPreparingCount={orderAudit?.data?.stuckPreparingOrders?.length || 0}
            stuckReadyCount={orderAudit?.data?.stuckReadyOrders?.length || 0}
            overpaidCount={paymentAudit?.data?.overpaidOrders || 0}
            underpaidCount={paymentAudit?.data?.underpaidOrders || 0}
            isLoading={isOrderLoading || isPaymentLoading}
          />

          {/* Preset Date Range Selector Filters */}
          <ReportFilters
            filters={filters}
            onPresetChange={updatePreset}
            onCustomRangeChange={updateCustomRange}
          />

          {/* Audit breakdown modules split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 flex flex-col gap-6">
              <PaymentAuditTable data={paymentAudit?.data} isLoading={isPaymentLoading} />
            </div>

            <div className="lg:col-span-2">
              <OrderIntegrityTable data={orderAudit?.data} isLoading={isOrderLoading} />
            </div>
          </div>

          {/* Closing Snapshot Ledger Widget */}
          <SnapshotCard
            data={snapshot?.data}
            isLoading={isSnapshotLoading}
            selectedDate={snapshotDate}
            onDateChange={(d) => setSnapshotDate(d)}
          />
        </div>
      )}
    </div>
  );
}
