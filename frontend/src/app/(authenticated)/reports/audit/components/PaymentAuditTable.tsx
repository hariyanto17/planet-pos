import React from "react";

interface PaymentAuditProps {
  data?: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    overpaidOrders: number;
    underpaidOrders: number;
  };
  isLoading: boolean;
}

export const PaymentAuditTable: React.FC<PaymentAuditProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-40 bg-surface border border-border rounded-2xl animate-pulse" />
    );
  }

  const items = [
    { label: "Total Orders Audited", val: data?.totalOrders || 0, color: "text-text-primary" },
    { label: "Fully Paid Orders", val: data?.paidOrders || 0, color: "text-emerald-400" },
    { label: "Awaiting Collections (Pending)", val: data?.pendingOrders || 0, color: "text-amber-400" },
    { label: "Overpaid Orders", val: data?.overpaidOrders || 0, color: data?.overpaidOrders && data?.overpaidOrders > 0 ? "text-rose-400 font-black" : "text-text-muted" },
    { label: "Underpaid Orders", val: data?.underpaidOrders || 0, color: data?.underpaidOrders && data?.underpaidOrders > 0 ? "text-rose-400 font-black" : "text-text-muted" },
  ];

  return (
    <div className="p-5 bg-surface border border-border/80 rounded-2xl shadow-md flex flex-col gap-4">
      <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">
        Payment Reconciliation Ledger Audit
      </span>

      <div className="flex flex-col border border-border/60 rounded-xl divide-y divide-border/50 overflow-hidden bg-surface-secondary/20">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center px-4 py-3.5">
            <span className="text-text-muted text-xs font-bold uppercase tracking-wider">{item.label}</span>
            <span className={`text-sm font-extrabold ${item.color}`}>{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PaymentAuditTable;
