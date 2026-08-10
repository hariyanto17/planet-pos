"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import {
  useGetCurrentShiftQuery,
  useOpenShiftMutation,
  useGetShiftReconciliationQuery,
  useCloseShiftMutation,
} from "@/lib/api/shiftsApi";
import { ShiftStatusCard } from "./components/ShiftStatusCard";
import { OpeningCashModal } from "./components/OpeningCashModal";
import { ShiftSummary } from "./components/ShiftSummary";
import { CashReconciliation } from "./components/CashReconciliation";
import { CloseShiftModal } from "./components/CloseShiftModal";
import { Button } from "@/components/Button";
import { TEXT } from "@/lib/i18n/id";

export default function ShiftsPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  // Queries
  const { data: currentShift, isLoading: isShiftLoading, refetch: refetchShift } = useGetCurrentShiftQuery();
  
  const shiftId = currentShift?.status === "OPEN" ? currentShift.id : "";
  const { data: reconciliation, isLoading: isReconLoading } = useGetShiftReconciliationQuery(shiftId, {
    skip: !shiftId,
  });

  // Mutations
  const [openShift] = useOpenShiftMutation();
  const [closeShift] = useCloseShiftMutation();

  const handleOpenShift = async (openingCash: number) => {
    await openShift({ openingCash }).unwrap();
    refetchShift();
  };

  const handleCloseShift = async (actualCash: number, notes?: string) => {
    await closeShift({ shiftId, actualCash, notes }).unwrap();
    refetchShift();
  };

  if (!currentUser) return null;

  const isOpen = currentShift?.status === "OPEN";

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-text-primary">{TEXT.shifts.title}</h1>
          <p className="text-text-muted text-sm">
            {TEXT.shifts.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen && !isShiftLoading && (
            <Button variant="primary" onClick={() => setOpenModalOpen(true)}>
              {TEXT.shifts.openBtn}
            </Button>
          )}
          {isOpen && (
            <Button variant="danger" onClick={() => setCloseModalOpen(true)}>
              {TEXT.shifts.closeBtn}
            </Button>
          )}
        </div>
      </div>

      <ShiftStatusCard data={currentShift} isLoading={isShiftLoading} />

      {!isOpen && !isShiftLoading ? (
        <div className="p-8 border border-border bg-surface/30 text-center rounded-2xl flex flex-col items-center justify-center gap-4 max-w-md mx-auto mt-6 shadow-md">
          <span className="text-3xl">🔒</span>
          <div className="flex flex-col gap-1">
            <h3 className="text-text-primary font-bold">{TEXT.shifts.noActiveShiftTitle}</h3>
            <p className="text-text-muted text-xs">
              {TEXT.shifts.noActiveShiftDesc}
            </p>
          </div>
          <Button variant="primary" onClick={() => setOpenModalOpen(true)}>
            {TEXT.shifts.openShiftNow}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Active Sales Breakdown widgets */}
          <ShiftSummary data={currentShift} isLoading={isShiftLoading} />

          {/* Reconciliation balances table */}
          <div className="max-w-xl">
            <CashReconciliation data={reconciliation} isLoading={isReconLoading} />
          </div>
        </div>
      )}

      {/* Opening shift modal */}
      <OpeningCashModal
        isOpen={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        onSubmit={handleOpenShift}
      />

      {/* Closing shift modal */}
      <CloseShiftModal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onSubmit={handleCloseShift}
        expectedCash={reconciliation?.expectedCash || 0}
      />
    </div>
  );
}
