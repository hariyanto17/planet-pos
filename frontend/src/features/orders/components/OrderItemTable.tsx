import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  note?: string | null;
}

interface OrderItemTableProps {
  items?: OrderItem[];
}

export const OrderItemTable: React.FC<OrderItemTableProps> = ({ items = [] }) => {
  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-4 shadow-md overflow-x-auto">
      <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-wider border-b border-zinc-800 pb-2">
        Items Summary
      </h3>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase font-black">
            <th className="py-3 px-4">Qty</th>
            <th className="py-3 px-4">Product</th>
            <th className="py-3 px-4 text-right">Price</th>
            <th className="py-3 px-4 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const subtotal = Number(item.unitPrice) * item.quantity;
            return (
              <tr key={item.id} className="border-b border-zinc-800/50 text-sm text-zinc-200">
                <td className="py-4 px-4 font-bold text-indigo-400">x{item.quantity}</td>
                <td className="py-4 px-4 flex flex-col gap-1">
                  <span className="font-semibold">{item.productName}</span>
                  {item.note ? (
                    <span className="text-[10px] text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 max-w-max">
                      ⚠️ {item.note}
                    </span>
                  ) : null}
                </td>
                <td className="py-4 px-4 text-right text-zinc-400">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-4 px-4 text-right font-semibold">
                  {formatCurrency(subtotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default OrderItemTable;
