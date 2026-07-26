import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { CashierShiftData } from "../types";

interface ShiftSummaryProps {
  data?: CashierShiftData;
  isLoading: boolean;
}

export const ShiftSummary: React.FC<ShiftSummaryProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="h-28 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const items = [
    {
      title: "Total Paid Sales",
      value: formatCurrency(data?.sales || 0),
      desc: "All transaction checkouts aggregated",
      color: "text-indigo-400",
    },
    {
      title: "Cash Payments Received",
      value: formatCurrency(data?.cashSales || 0),
      desc: "Total physical cash collections",
      color: "text-emerald-400",
    },
    {
      title: "QRIS Payments Cleared",
      value: formatCurrency(data?.qrisSales || 0),
      desc: "Digital gateway settlements",
      color: "text-zinc-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-1.5 shadow"
        >
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
            {item.title}
          </span>
          <span className={`text-2xl font-black ${item.color} tracking-tight`}>
            {item.value}
          </span>
          <p className="text-zinc-500 text-[10px] font-medium">{item.desc}</p>
        </div>
      ))}
    </div>
  );
};
export default ShiftSummary;
