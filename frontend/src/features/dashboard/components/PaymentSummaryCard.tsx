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
      <div className="p-6 bg-surface border border-border/80 rounded-2xl flex flex-col gap-4 shadow-md">
        <Skeleton className="h-4 w-1/3" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-surface border border-border/80 rounded-2xl flex flex-col gap-4 shadow-md">
      <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Payment Summary</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-surface-secondary border border-border rounded-xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-text-muted text-xs font-semibold">💵 Cash</span>
            <span className="text-xl font-bold text-text-primary">{formatCurrency(cashAmount)}</span>
          </div>
        </div>
        <div className="p-4 bg-surface-secondary border border-border rounded-xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-text-muted text-xs font-semibold">📱 QRIS</span>
            <span className="text-xl font-bold text-text-primary">{formatCurrency(qrisAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PaymentSummaryCard;
