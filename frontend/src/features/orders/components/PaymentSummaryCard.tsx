import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface PaymentSummaryCardProps {
  payments?: any[];
}

export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({ payments = [] }) => {
  const latestPayment = payments[0];

  if (!latestPayment) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center text-zinc-500 text-sm">
        No payment record attached to this transaction.
      </div>
    );
  }

  const paymentMethod = latestPayment.method || "CASH";
  const isCash = paymentMethod === "CASH";

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-5 shadow-md">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-wider">
          Payment Information
        </h3>
        <PaymentStatusBadge status={latestPayment.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 text-xs font-semibold">Payment Method</span>
          <span className="text-zinc-200 font-bold">{paymentMethod}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 text-xs font-semibold">Amount to Collect</span>
          <span className="text-zinc-200 font-bold">{formatCurrency(latestPayment.amount)}</span>
        </div>

        {isCash && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-xs font-semibold">Cash Tendered</span>
              <span className="text-zinc-200 font-medium">
                {formatCurrency(
                  latestPayment.status === "PAID"
                    ? latestPayment.receivedCash
                    : latestPayment.estimatedCash
                )}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-xs font-semibold">Change Returned</span>
              <span className="text-emerald-400 font-bold">
                {formatCurrency(latestPayment.changeAmount)}
              </span>
            </div>
          </>
        )}

        {latestPayment.status === "PAID" && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-xs font-semibold">Confirmed By</span>
              <span className="text-zinc-200 font-medium">
                {latestPayment.confirmedBy?.fullName ||
                  latestPayment.confirmedBy?.username ||
                  "Self Service (System)"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-xs font-semibold">Confirmed At</span>
              <span className="text-zinc-200 font-medium">
                {latestPayment.confirmedAt
                  ? new Date(latestPayment.confirmedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "N/A"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default PaymentSummaryCard;
