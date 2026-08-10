import React from "react";

interface OrderStatusBadgeProps {
  status: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const styles = {
    PREPARING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    READY: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }[status] || "bg-zinc-500/10 text-text-secondary border-zinc-500/20";

  return (
    <span className={`text-xs px-2.5 py-0.5 rounded font-black uppercase tracking-wider border ${styles}`}>
      {status}
    </span>
  );
};
export default OrderStatusBadge;
