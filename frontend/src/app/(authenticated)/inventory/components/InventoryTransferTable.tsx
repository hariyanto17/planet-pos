import React, { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useGetStockTransfersQuery, useCompleteStockTransferMutation } from "@/lib/api/inventoryApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useToast } from "@/components/ToastProvider";
import { IconButton } from "@/components/IconButton";
import { ArrowDownToLine } from "lucide-react";

interface Props {
  onSuccess: () => void;
}

export function InventoryTransferTable({ onSuccess }: Props) {
  const currentUser = useAppSelector(selectCurrentUser);
  const toast = useToast();
  const { data: transfers = [], isLoading, refetch } = useGetStockTransfersQuery();
  const [completeTransfer, { isLoading: isCompleting }] = useCompleteStockTransferMutation();

  // Local tab/view state for WAREHOUSE users
  const [warehouseView, setWarehouseView] = useState<"MASUK" | "KELUAR">("MASUK");

  // State for confirm complete
  const [completingTransferItem, setCompletingTransferItem] = useState<any>(null);

  if (!currentUser) return null;

  // Filter transfers based on role and active view
  const filteredTransfers = transfers.filter((t: any) => {
    if (currentUser.role === "ADMIN") {
      return true;
    }
    if (currentUser.role === "KITCHEN") {
      return t.destinationWarehouse?.warehouseType === "KITCHEN_STORAGE";
    }
    if (currentUser.role === "WAREHOUSE") {
      const userWhId = currentUser.warehouseId;
      if (warehouseView === "MASUK") {
        return t.destinationWarehouseId === userWhId;
      } else {
        return t.sourceWarehouseId === userWhId;
      }
    }
    return false;
  });

  const handleConfirmComplete = async () => {
    if (!completingTransferItem) return;
    try {
      await completeTransfer(completingTransferItem.id).unwrap();
      toast.success("Transfer berhasil diselesaikan");
      refetch();
      onSuccess(); // refresh stock statistics and product inventory tables
      setCompletingTransferItem(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal menyelesaikan transfer");
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Selesai
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-text-secondary border border-zinc-500/20 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        Draft
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Sub-tabs for WAREHOUSE users */}
      {currentUser.role === "WAREHOUSE" && (
        <div className="flex border-b border-border/40 gap-1 pb-px">
          {[
            { id: "MASUK", label: "Transfer Masuk" },
            { id: "KELUAR", label: "Transfer Keluar" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setWarehouseView(v.id as "MASUK" | "KELUAR")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 whitespace-nowrap transition duration-150 ${
                warehouseView === v.id
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      <DataTable
        headers={[
          "Tanggal",
          "Dari Gudang",
          "Ke Gudang",
          "Produk",
          "Quantity",
          "Status",
          "Action",
        ]}
        isLoading={isLoading}
      >
        {filteredTransfers.map((t: any) => {
          const item = t.items?.[0]; // Get the first item (we usually only transfer one item in the MVP)
          const productName = item
            ? item.materialVariant?.material
              ? `${item.materialVariant.material.name} - ${item.materialVariant.name}`
              : item.materialVariant?.name || "-"
            : "-";
          const quantity = item ? Number(item.quantity) : 0;
          const isIncomingDraft =
            t.status === "DRAFT" &&
            (currentUser.role === "ADMIN" ||
              (currentUser.role === "WAREHOUSE" && t.destinationWarehouseId === currentUser.warehouseId) ||
              (currentUser.role === "KITCHEN" && t.destinationWarehouse?.warehouseType === "KITCHEN_STORAGE"));

          return (
            <tr key={t.id} className="border-b border-border/40 hover:bg-zinc-800/10 animate-fade-in">
              <td className="px-6 py-4 text-xs font-medium text-text-secondary">
                {new Date(t.createdAt).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-6 py-4 text-xs font-semibold text-text-primary">
                {t.sourceWarehouse?.name}
              </td>
              <td className="px-6 py-4 text-xs font-semibold text-text-primary">
                {t.destinationWarehouse?.name}
              </td>
              <td className="px-6 py-4 text-xs font-bold text-text-primary font-sans">
                {productName}
              </td>
              <td className="px-6 py-4 text-xs font-extrabold text-text-primary font-mono">
                {quantity}
              </td>
              <td className="px-6 py-4">{renderStatusBadge(t.status)}</td>
              <td className="px-6 py-4 text-xs font-medium">
                {isIncomingDraft ? (
                  <IconButton
                    icon={ArrowDownToLine}
                    label="Terima Transfer"
                    onClick={() => setCompletingTransferItem(t)}
                    className="text-indigo-400 hover:bg-indigo-400/10 hover:text-indigo-300"
                  />
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
            </tr>
          );
        })}
      </DataTable>

      {filteredTransfers.length === 0 && !isLoading && (
        <div className="p-8 border border-border/60 bg-surface-secondary/20 text-center rounded-xl text-text-muted text-sm">
          Tidak ada data transfer stok.
        </div>
      )}

      {completingTransferItem && (
        <ConfirmDialog
          isOpen={!!completingTransferItem}
          onClose={() => setCompletingTransferItem(null)}
          onConfirm={handleConfirmComplete}
          title="Terima Transfer Stok"
          message={`Terima transfer dari ${completingTransferItem.sourceWarehouse?.name} ke ${completingTransferItem.destinationWarehouse?.name}?`}
          isConfirming={isCompleting}
        />
      )}
    </div>
  );
}
