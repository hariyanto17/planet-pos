import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { ShiftReconciliationData } from "../types";

interface CashReconciliationProps {
  data?: ShiftReconciliationData;
  isLoading: boolean;
}

export const CashReconciliation: React.FC<CashReconciliationProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-44 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
    );
  }

  const items = [
    { label: "Opening Drawer Cash", val: data?.openingCash || 0, color: "text-zinc-300" },
    { label: "Cash Sales Collected", val: data?.cashSales || 0, color: "text-emerald-400" },
    { label: "Expected Cash Drawer Balance", val: data?.expectedCash || 0, color: "text-indigo-400 font-extrabold" },
    { label: "Actual Cash Counted", val: data?.actualCash || 0, color: "text-zinc-200" },
  ];

  const diff = data?.difference || 0;
  const isBalanced = diff === 0;

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-md flex flex-col gap-5">
      <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
        Shift Cash Drawer Reconciliation
      </span>

      <div className="flex flex-col border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/50 overflow-hidden bg-zinc-950/20">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center px-4 py-3.5">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{item.label}</span>
            <span className={`text-sm font-extrabold ${item.color}`}>{formatCurrency(item.val)}</span>
          </div>
        ))}
      </div>

      <div
        className={`p-4 border rounded-xl flex items-center justify-between text-xs font-bold uppercase tracking-wider ${
          isBalanced
            ? "border-emerald-500/30 bg-emerald-950/15 text-emerald-400"
            : diff > 0
            ? "border-amber-500/30 bg-amber-950/15 text-amber-400"
            : "border-rose-500/30 bg-rose-950/15 text-rose-400"
        }`}
      >
        <span>Drawer Difference Offset</span>
        <span>
          {isBalanced ? "Drawer Balanced (Rp 0)" : `${diff > 0 ? "+" : ""}${formatCurrency(diff)}`}
        </span>
      </div>
    </div>
  );
};
export default CashReconciliation;
