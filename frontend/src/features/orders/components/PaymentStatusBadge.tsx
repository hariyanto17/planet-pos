import React from "react";

interface PaymentStatusBadgeProps {
  status: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const styles = {
    PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  }[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

  return (
    <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border ${styles}`}>
      {status}
    </span>
  );
};
export default PaymentStatusBadge;
