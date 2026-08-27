import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { CashierShiftData } from "../types";
import { TEXT } from "@/lib/i18n/id";
import { CheckCircle2, CircleOff } from "lucide-react";

interface ShiftStatusProps {
  data?: CashierShiftData;
  isLoading: boolean;
}

export const ShiftStatusCard: React.FC<ShiftStatusProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-surface border border-border rounded-2xl animate-pulse flex flex-col gap-3">
        <div className="h-6 w-1/3 bg-zinc-800 rounded-md" />
        <div className="h-10 w-2/3 bg-zinc-800 rounded-md" />
      </div>
    );
  }

  const isOpen = data?.status === "OPEN";

  return (
    <div
      className={`p-6 border rounded-2xl flex items-start gap-4 shadow-md ${isOpen
          ? "border-emerald-500/30 text-emerald-400"
          : "border-border bg-surface/60 text-text-secondary"
        }`}
    >
      <div className="mt-0.5">
        {isOpen ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        ) : (
          <CircleOff className="w-8 h-8 text-zinc-400" />
        )}
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        <span className="text-text-muted text-xs font-bold uppercase tracking-wider">
          {TEXT.shifts.statusTitle}
        </span>
        <h2 className="text-xl font-black tracking-tight text-text-primary">
          {isOpen ? `${TEXT.shifts.statusOpen} ${data.cashier}` : TEXT.shifts.statusClosed}
        </h2>
        {isOpen && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs font-semibold text-text-secondary">
            <span>Waktu Dibuka: <strong className="text-text-primary">{new Date(data.openedAt!).toLocaleString()}</strong></span>
            <span>Saldo Awal: <strong className="text-text-primary">{formatCurrency(data.openingCash || 0)}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
