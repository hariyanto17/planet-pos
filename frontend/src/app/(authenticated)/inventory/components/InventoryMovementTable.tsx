import React from "react";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { TEXT } from "@/lib/i18n/id";

interface InventoryMovementTableProps {
  movementsList: any[];
  isLoading: boolean;
  movementPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function InventoryMovementTable({
  movementsList,
  isLoading,
  movementPage,
  totalPages,
  onPageChange,
}: InventoryMovementTableProps) {
  const renderMovementBadge = (type: string) => {
    switch (type) {
      case "OPENING":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Stok Awal</span>;
      case "RECEIVE":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Penerimaan Barang</span>;
      case "SALE":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Penjualan</span>;
      case "ADJUSTMENT":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Penyesuaian Stok</span>;
      case "WASTE":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Barang Rusak</span>;
      default:
        return <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{type}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        headers={[
          TEXT.inventory.dateCol,
          TEXT.inventory.warehouseCol,
          TEXT.inventory.productCol,
          TEXT.inventory.typeCol,
          TEXT.inventory.movementQtyCol,
          TEXT.inventory.balanceAfterCol,
          TEXT.inventory.userCol,
          TEXT.inventory.remarksCol,
        ]}
        isLoading={isLoading}
      >
        {movementsList.map((m: any) => (
          <tr key={m.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/10 animate-fade-in">
            <td className="px-6 py-4 text-[10px] font-bold text-zinc-500 font-mono">
              {new Date(m.createdAt).toLocaleString()}
            </td>
            <td className="px-6 py-4 text-xs font-semibold text-zinc-300">{m.warehouseName}</td>
            <td className="px-6 py-4 text-xs font-bold text-zinc-200">
              {m.productName} <span className="text-[10px] text-zinc-500 font-mono">({m.sku})</span>
            </td>
            <td className="px-6 py-4">{renderMovementBadge(m.movementType)}</td>
            <td
              className={`px-6 py-4 text-xs font-extrabold font-mono ${
                m.quantity > 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {m.quantity > 0 ? `+${m.quantity.toFixed(3)}` : m.quantity.toFixed(3)}
            </td>
            <td className="px-6 py-4 text-xs font-semibold text-zinc-300 font-mono">
              {m.quantityAfter.toFixed(3)}
            </td>
            <td className="px-6 py-4 text-xs font-medium text-zinc-400">{m.createdBy}</td>
            <td className="px-6 py-4 text-xs text-zinc-500 truncate max-w-[200px]" title={m.remarks}>
              {m.remarks}
            </td>
          </tr>
        ))}
      </DataTable>

      {movementsList.length === 0 && !isLoading && (
        <div className="p-8 border border-zinc-800/60 bg-zinc-950/20 text-center rounded-xl text-zinc-500 text-sm">
          {TEXT.inventory.emptyMovements}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={movementPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
