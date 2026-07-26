import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface SnapshotCardProps {
  data?: {
    businessDate: string;
    orders: number;
    grossRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    cashRevenue: number;
    qrisRevenue: number;
    generatedAt: string;
  };
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const SnapshotCard: React.FC<SnapshotCardProps> = ({
  data,
  isLoading,
  selectedDate,
  onDateChange,
}) => {
  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-md flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
            Daily Closing Accounting Snapshot
          </span>
          <p className="text-zinc-500 text-[10px] font-medium">
            Retrieve finalized accounting snapshots by operational business date.
          </p>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 outline-none text-xs font-bold uppercase focus:border-indigo-500"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-6">
          <div className="h-6 w-full bg-zinc-800 animate-pulse rounded-md" />
          <div className="h-6 w-2/3 bg-zinc-800 animate-pulse rounded-md" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl flex flex-col gap-1">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Business Date</span>
            <span className="text-zinc-200 text-sm font-extrabold">{data?.businessDate}</span>
          </div>

          <div className="p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl flex flex-col gap-1">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Fulfillment Orders count</span>
            <span className="text-zinc-200 text-sm font-extrabold">{data?.orders} Orders</span>
          </div>

          <div className="p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl flex flex-col gap-1">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Gross Concession Sales</span>
            <span className="text-zinc-200 text-sm font-extrabold">{formatCurrency(data?.grossRevenue || 0)}</span>
          </div>

          <div className="p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl flex flex-col gap-1">
            <span className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-wider">Cleared PAID Revenue</span>
            <span className="text-emerald-400 text-sm font-extrabold">{formatCurrency(data?.paidRevenue || 0)}</span>
          </div>

          <div className="p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl flex flex-col gap-1">
            <span className="text-amber-400/80 text-[10px] font-bold uppercase tracking-wider">Pending Cash Collects</span>
            <span className="text-amber-400 text-sm font-extrabold">{formatCurrency(data?.pendingRevenue || 0)}</span>
          </div>

          <div className="p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl flex flex-col gap-1">
            <span className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-wider">Settled QRIS Bank Gateway</span>
            <span className="text-indigo-400 text-sm font-extrabold">{formatCurrency(data?.qrisRevenue || 0)}</span>
          </div>
        </div>
      )}

      {data && (
        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-right mt-1">
          Archived Closing Snapshot: {new Date(data.generatedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
};
export default SnapshotCard;
