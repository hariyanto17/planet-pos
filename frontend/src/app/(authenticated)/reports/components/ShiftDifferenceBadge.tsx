import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface ShiftDifferenceBadgeProps {
  difference: number | null;
  status: "OPEN" | "CLOSED";
}

export const ShiftDifferenceBadge: React.FC<ShiftDifferenceBadgeProps> = ({ difference, status }) => {
  if (status === "OPEN" || difference === null) {
    return <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">-</span>;
  }

  const diff = difference;
  const isBalanced = diff === 0;

  let color = "text-emerald-400";
  let label = "Balanced";

  if (diff > 0) {
    color = "text-amber-400 font-black";
    label = `+${formatCurrency(diff)} (Surplus)`;
  } else if (diff < 0) {
    color = "text-rose-400 font-black";
    label = `${formatCurrency(diff)} (Shortage)`;
  } else {
    label = "Balanced (Rp 0)";
  }

  return <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>;
};
export default ShiftDifferenceBadge;
