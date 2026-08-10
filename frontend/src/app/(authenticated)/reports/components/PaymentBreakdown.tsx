import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { PaymentReport, ReconciliationReport } from "../types";

interface PaymentBreakdownProps {
  paymentData?: PaymentReport;
  reconciliationData?: ReconciliationReport;
  isLoading: boolean;
}

export const PaymentBreakdown: React.FC<PaymentBreakdownProps> = ({
  paymentData,
  reconciliationData,
  isLoading,
}) => {
  const cash = paymentData?.cash || { paid: 0, pending: 0 };
  const qris = paymentData?.qris || { paid: 0, pending: 0 };
  const cancelled = paymentData?.cancelled || 0;
  const outstanding = reconciliationData?.outstandingAmount || 0;
  const unpaidCount = reconciliationData?.unpaidOrderCount || 0;

  const collectionList = [
    {
      title: "Cash Collections (Paid)",
      amount: formatCurrency(cash.paid),
      count: `Pending: ${formatCurrency(cash.pending)}`,
      desc: "Cleared cash vs cash collections pending checkin",
      color: "text-emerald-400",
    },
    {
      title: "QRIS Settlements (Paid)",
      amount: formatCurrency(qris.paid),
      count: `Pending: ${formatCurrency(qris.pending)}`,
      desc: "Bank cleared gate QR vs unconfirmed scans",
      color: "text-indigo-400",
    },
    {
      title: "Cancelled Payments",
      amount: formatCurrency(cancelled),
      count: "Cancelled state total",
      desc: "Total value of aborted checkouts",
      color: "text-red-400",
    },
    {
      title: "Total Outstanding Balance",
      amount: formatCurrency(outstanding),
      count: `${unpaidCount} unpaid orders`,
      desc: "Difference between expected and collected",
      color: "text-text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {collectionList.map((card, idx) => (
        <div
          key={idx}
          className="p-5 bg-surface border border-border/80 rounded-2xl flex flex-col gap-1.5 shadow"
        >
          <span className="text-text-muted text-xs font-bold uppercase tracking-wider">
            {card.title}
          </span>
          {isLoading ? (
            <div className="h-8 w-2/3 bg-zinc-800 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className={`text-xl font-extrabold ${card.color} tracking-tight`}>
                {card.amount}
              </span>
              <span className="text-text-secondary text-xs font-semibold">{card.count}</span>
            </div>
          )}
          <p className="text-text-muted text-xs mt-1 font-medium">{card.desc}</p>
        </div>
      ))}
    </div>
  );
};
export default PaymentBreakdown;
