import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { CashierShiftData } from "../types";

interface ShiftStatusProps {
  data?: CashierShiftData;
  isLoading: boolean;
}

export const ShiftStatusCard: React.FC<ShiftStatusProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse flex flex-col gap-3">
        <div className="h-6 w-1/3 bg-zinc-800 rounded-md" />
        <div className="h-10 w-2/3 bg-zinc-800 rounded-md" />
      </div>
    );
  }

  const isOpen = data?.status === "OPEN";

  return (
    <div
      className={`p-6 border rounded-2xl flex items-start gap-4 shadow-md ${
        isOpen
          ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
      }`}
    >
      <span className="text-3xl select-none">{isOpen ? "🟢" : "⚪"}</span>
      <div className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Cashier Drawer status
        </span>
        <h2 className="text-xl font-black tracking-tight">
          {isOpen ? `Shift OPEN — Operating by ${data.cashier}` : "Shift CLOSED — Cash drawer locked"}
        </h2>
        {isOpen && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs font-semibold text-zinc-400">
            <span>Opened At: <strong className="text-zinc-200">{new Date(data.openedAt!).toLocaleString()}</strong></span>
            <span>Opening Balance: <strong className="text-zinc-200">{formatCurrency(data.openingCash || 0)}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
export default ShiftStatusCard;
