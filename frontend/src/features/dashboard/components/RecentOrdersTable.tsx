import React from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/Button";
import { formatCurrency, formatOrderNumber, formatRelativeTime } from "@/utils/formatters";

interface RecentOrdersTableProps {
  orders: any[];
  loading?: boolean;
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  loading = false,
}) => {
  const router = useRouter();

  if (orders.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800/80 rounded-2xl text-center shadow-md">
        <span className="text-zinc-500 text-sm font-semibold">No transactions today.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-wider">Latest Orders</h3>
        <Button variant="ghost" onClick={() => router.push("/orders")}>
          View All Orders
        </Button>
      </div>

      <DataTable
        headers={[
          "Order Number",
          "Customer",
          "Table",
          "Source",
          "Payment",
          "Status",
          "Total",
          "Created At",
        ]}
        isLoading={loading}
      >
        {orders.slice(0, 10).map((order) => {
          const latestPayment = order.payments?.[0];
          const paymentMethod = latestPayment?.method || "CASH";
          const paymentStatus = latestPayment?.status || "PENDING";

          return (
            <tr
              key={order.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/20 transition"
            >
              <td className="px-6 py-4 text-sm font-bold text-zinc-100">
                {formatOrderNumber(order.displayNumber)}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-300">{order.customerName}</td>
              <td className="px-6 py-4 text-sm text-zinc-300">
                {order.table?.name || "Walk-in"}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-400">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-zinc-950 border border-zinc-800">
                  {order.source === "SELF_ORDER" ? "SELF ORDER" : "CASHIER"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`font-semibold ${
                    paymentStatus === "PAID" ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {paymentMethod} ({paymentStatus})
                </span>
              </td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                    order.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : order.status === "READY"
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-bold text-zinc-200">
                {formatCurrency(order.grandTotal)}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-400">
                {formatRelativeTime(order.createdAt)}
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
};
export default RecentOrdersTable;
