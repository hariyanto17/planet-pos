import React from "react";

interface AuditSummaryCardProps {
  invalidCompletedCount: number;
  stuckPreparingCount: number;
  stuckReadyCount: number;
  overpaidCount: number;
  underpaidCount: number;
  isLoading: boolean;
}

export const AuditSummaryCard: React.FC<AuditSummaryCardProps> = ({
  invalidCompletedCount,
  stuckPreparingCount,
  stuckReadyCount,
  overpaidCount,
  underpaidCount,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse flex flex-col gap-3">
        <div className="h-6 w-1/3 bg-zinc-800 rounded-md" />
        <div className="h-10 w-2/3 bg-zinc-800 rounded-md" />
      </div>
    );
  }

  let statusText = "All transactions balanced and lifecycle verified";
  let statusColor = "border-emerald-500/30 bg-emerald-950/20 text-emerald-400";
  let statusIcon = "✅";

  if (invalidCompletedCount > 0) {
    statusText = `${invalidCompletedCount} completed orders detected without payment record!`;
    statusColor = "border-rose-500/30 bg-rose-950/20 text-rose-400";
    statusIcon = "❌";
  } else if (overpaidCount > 0 || underpaidCount > 0 || stuckPreparingCount > 0 || stuckReadyCount > 0) {
    statusText = "Warnings: Payment reconciliation differences or stuck kitchen tickets detected";
    statusColor = "border-amber-500/30 bg-amber-950/20 text-amber-400";
    statusIcon = "⚠️";
  }

  return (
    <div className={`p-6 border rounded-2xl flex items-start gap-4 shadow-md ${statusColor}`}>
      <span className="text-3xl select-none">{statusIcon}</span>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Accounting Health Ledger Status
        </span>
        <h2 className="text-lg font-black tracking-tight leading-snug">
          {statusText}
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs font-semibold text-zinc-500">
          <span>Stuck Preparing: <strong className="text-zinc-300">{stuckPreparingCount}</strong></span>
          <span>Stuck Ready: <strong className="text-zinc-300">{stuckReadyCount}</strong></span>
          <span>Reconciliation Discrepancies: <strong className="text-zinc-300">{overpaidCount + underpaidCount}</strong></span>
        </div>
      </div>
    </div>
  );
};
export default AuditSummaryCard;
