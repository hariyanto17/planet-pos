import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { DataTable } from "@/components/DataTable";

interface OrderIntegrityProps {
  data?: {
    invalidCompletedOrders: {
      orderId: string;
      orderNumber: string;
      grandTotal: number;
      businessDate: string;
    }[];
    stuckPreparingOrders: {
      orderId: string;
      orderNumber: string;
      grandTotal: number;
      createdAt: string;
    }[];
    stuckReadyOrders: {
      orderId: string;
      orderNumber: string;
      grandTotal: number;
      createdAt: string;
    }[];
  };
  isLoading: boolean;
}

export const OrderIntegrityTable: React.FC<OrderIntegrityProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
    );
  }

  const invalidOrders = data?.invalidCompletedOrders || [];
  const stuckPreparing = data?.stuckPreparingOrders || [];
  const stuckReady = data?.stuckReadyOrders || [];

  return (
    <div className="flex flex-col gap-6 p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-md">
      {/* 1. Invalid Completed Orders */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-rose-400 text-xs font-bold uppercase tracking-wider">
            Completed Orders Without PAID Payment
          </span>
          <p className="text-zinc-500 text-[10px] font-medium leading-relaxed">
            CRITICAL error: Orders flagged COMPLETED in the database but containing zero payments marked PAID.
          </p>
        </div>

        <DataTable headers={["Order ID", "Business Date", "Grand Total"]} isLoading={isLoading}>
          {invalidOrders.map((o) => (
            <tr key={o.orderId} className="border-b border-zinc-800/50">
              <td className="px-6 py-4 text-xs font-extrabold text-zinc-300 font-mono">
                {o.orderNumber}
              </td>
              <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                {o.businessDate}
              </td>
              <td className="px-6 py-4 text-xs font-black text-rose-400">
                {formatCurrency(o.grandTotal)}
              </td>
            </tr>
          ))}
        </DataTable>

        {invalidOrders.length === 0 && (
          <div className="p-4 border border-zinc-800/60 bg-emerald-950/5 text-center rounded-xl text-emerald-400 text-xs font-bold uppercase tracking-wider">
            ✅ No completed orders missing payment records.
          </div>
        )}
      </div>

      {/* 2. Stuck Kitchen Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800/50">
        {/* Stuck Preparing */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
              Stuck Preparing Orders (&gt;2h)
            </span>
            <p className="text-zinc-500 text-[10px] font-medium">
              Orders stuck in kitchen preparation queue for longer than two hours.
            </p>
          </div>

          <DataTable headers={["Order ID", "Created At", "Total"]} isLoading={isLoading}>
            {stuckPreparing.map((o) => (
              <tr key={o.orderId} className="border-b border-zinc-800/50">
                <td className="px-6 py-4 text-xs font-bold text-zinc-300 font-mono">
                  {o.orderNumber}
                </td>
                <td className="px-6 py-4 text-[10px] text-zinc-500 font-medium">
                  {new Date(o.createdAt).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 text-xs text-zinc-400 font-bold">
                  {formatCurrency(o.grandTotal)}
                </td>
              </tr>
            ))}
          </DataTable>

          {stuckPreparing.length === 0 && (
            <div className="p-3 border border-zinc-800/50 bg-zinc-950/20 text-center rounded-xl text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
              No stuck preparing tickets.
            </div>
          )}
        </div>

        {/* Stuck Ready */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
              Stuck Ready Orders (&gt;2h)
            </span>
            <p className="text-zinc-500 text-[10px] font-medium">
              Orders flagged ready but uncollected/undelivered for longer than two hours.
            </p>
          </div>

          <DataTable headers={["Order ID", "Created At", "Total"]} isLoading={isLoading}>
            {stuckReady.map((o) => (
              <tr key={o.orderId} className="border-b border-zinc-800/50">
                <td className="px-6 py-4 text-xs font-bold text-zinc-300 font-mono">
                  {o.orderNumber}
                </td>
                <td className="px-6 py-4 text-[10px] text-zinc-500 font-medium">
                  {new Date(o.createdAt).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 text-xs text-zinc-400 font-bold">
                  {formatCurrency(o.grandTotal)}
                </td>
              </tr>
            ))}
          </DataTable>

          {stuckReady.length === 0 && (
            <div className="p-3 border border-zinc-800/50 bg-zinc-950/20 text-center rounded-xl text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
              No stuck ready tickets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default OrderIntegrityTable;
