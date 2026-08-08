import React from "react";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { TEXT } from "@/lib/i18n/id";

interface InventoryStockTableProps {
  productsList: any[];
  isLoading: boolean;
  stockPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function InventoryStockTable({
  productsList,
  isLoading,
  stockPage,
  totalPages,
  onPageChange,
}: InventoryStockTableProps) {
  const renderStatusBadge = (status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE_STOCK" | string) => {
    switch (status) {
      case "IN_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Tersedia
          </span>
        );
      case "LOW_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Stok Menipis
          </span>
        );
      case "OUT_OF_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Stok Habis
          </span>
        );
      case "NEGATIVE_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            Stok Negatif
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        headers={[
          TEXT.inventory.productCol,
          TEXT.inventory.skuCol,
          TEXT.inventory.warehouseCol,
          TEXT.inventory.qtyCol,
          TEXT.inventory.minStockCol,
          TEXT.inventory.statusCol,
        ]}
        isLoading={isLoading}
      >
        {productsList.map((p: any) => (
          <tr key={p.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/10 animate-fade-in">
            <td className="px-6 py-4 text-xs font-bold text-zinc-200">{p.name}</td>
            <td className="px-6 py-4 text-xs font-medium text-zinc-400 font-mono">{p.sku}</td>
            <td className="px-6 py-4 text-xs font-semibold text-zinc-300">{p.warehouseName}</td>
            <td className="px-6 py-4 text-xs font-extrabold text-zinc-100 font-mono">
              {p.quantity} <span className="text-[10px] text-zinc-500 font-normal">{p.unit}</span>
            </td>
            <td className="px-6 py-4 text-xs font-medium text-zinc-500 font-mono">
              {p.minimumStock}
            </td>
            <td className="px-6 py-4">{renderStatusBadge(p.status)}</td>
          </tr>
        ))}
      </DataTable>

      {productsList.length === 0 && !isLoading && (
        <div className="p-8 border border-zinc-800/60 bg-zinc-950/20 text-center rounded-xl text-zinc-500 text-sm">
          {TEXT.inventory.emptyStock}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={stockPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
