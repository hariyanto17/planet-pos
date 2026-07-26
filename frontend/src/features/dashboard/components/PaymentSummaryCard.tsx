import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/Skeleton";

interface PaymentSummaryCardProps {
  cashAmount: number;
  qrisAmount: number;
  loading?: boolean;
}

export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({
  cashAmount,
  qrisAmount,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-4 shadow-md">
        <Skeleton className="h-4 w-1/3" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-4 shadow-md">
      <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Payment Summary</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-xs font-semibold">💵 Cash</span>
            <span className="text-xl font-bold text-zinc-100">{formatCurrency(cashAmount)}</span>
          </div>
        </div>
        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-xs font-semibold">📱 QRIS</span>
            <span className="text-xl font-bold text-zinc-100">{formatCurrency(qrisAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PaymentSummaryCard;
