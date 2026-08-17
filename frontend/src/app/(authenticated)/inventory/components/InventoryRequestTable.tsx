import React, { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { CheckCircle, Truck, ArrowDownToLine, Check, XCircle } from "lucide-react";
import {
  useGetStockRequestsQuery,
  useClaimStockRequestMutation,
  useShipStockRequestMutation,
  useReceiveStockRequestMutation,
  useAcceptStockRequestMutation,
  useCancelStockRequestMutation,
} from "@/lib/api/inventoryApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useToast } from "@/components/ToastProvider";

interface Props {
  warehouses: any[];
  onSuccess: () => void;
}

type Scope = "my-requests" | "available" | "my-fulfillments" | "incoming" | "completed";

export function InventoryRequestTable({ warehouses, onSuccess }: Props) {
  const currentUser = useAppSelector(selectCurrentUser);
  const toast = useToast();
  const [activeScope, setActiveScope] = useState<Scope>("my-requests");

  const { data: requests = [], isLoading, refetch } = useGetStockRequestsQuery({ scope: activeScope });

  const [claimRequest] = useClaimStockRequestMutation();
  const [shipRequest, { isLoading: isShipping }] = useShipStockRequestMutation();
  const [receiveRequest, { isLoading: isReceiving }] = useReceiveStockRequestMutation();
  const [acceptRequest, { isLoading: isAccepting }] = useAcceptStockRequestMutation();
  const [cancelRequest, { isLoading: isCancelling }] = useCancelStockRequestMutation();

  // Action modals states
  const [claimItem, setClaimItem] = useState<any>(null);
  const [claimSourceWarehouseId, setClaimSourceWarehouseId] = useState("");
  const [shipItem, setShipItem] = useState<any>(null);
  const [receiveItem, setReceiveItem] = useState<any>(null);
  const [acceptItem, setAcceptItem] = useState<any>(null);
  const [cancelItem, setCancelItem] = useState<any>(null);

  if (!currentUser) return null;

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimItem || !claimSourceWarehouseId) return;

    try {
      await claimRequest({ id: claimItem.id, sourceWarehouseId: claimSourceWarehouseId }).unwrap();
      toast.success("Permintaan berhasil di-claim");
      refetch();
      onSuccess();
      setClaimItem(null);
      setClaimSourceWarehouseId("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal meng-claim permintaan");
    }
  };

  const handleShipConfirm = async () => {
    if (!shipItem) return;
    try {
      await shipRequest(shipItem.id).unwrap();
      toast.success("Barang berhasil dikirim");
      refetch();
      onSuccess();
      setShipItem(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal mengirim barang");
    }
  };

  const handleReceiveConfirm = async () => {
    if (!receiveItem) return;
    try {
      await receiveRequest(receiveItem.id).unwrap();
      toast.success("Pengiriman berhasil diterima fisik");
      refetch();
      onSuccess();
      setReceiveItem(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal menerima pengiriman");
    }
  };

  const handleAcceptConfirm = async () => {
    if (!acceptItem) return;
    try {
      await acceptRequest(acceptItem.id).unwrap();
      toast.success("Barang berhasil diverifikasi & diterima sistem");
      refetch();
      onSuccess();
      setAcceptItem(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal memverifikasi barang");
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelItem) return;
    try {
      await cancelRequest(cancelItem.id).unwrap();
      toast.success("Permintaan berhasil dibatalkan");
      refetch();
      onSuccess();
      setCancelItem(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal membatalkan permintaan");
    }
  };

  const renderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
      FULFILLING: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
      SHIPPED: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
      RECEIVED: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
      ACCEPTED: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
      CANCELLED: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || ""}`}>
        {status}
      </span>
    );
  };

  const isWarehouseUser = currentUser.role === "WAREHOUSE";
  const userWhId = currentUser.warehouseId;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Scope sub-tabs */}
      <div className="flex border-b border-border/40 gap-1 pb-px overflow-x-auto">
        {[
          { id: "my-requests", label: "Permintaan Saya" },
          { id: "available", label: "Tersedia Claim" },
          { id: "my-fulfillments", label: "Fulfillment Saya" },
          { id: "incoming", label: "Barang Masuk" },
          { id: "completed", label: "Selesai" },
        ].map((s) => {
          // Hide available and my-fulfillments from roles that can't claim
          if ((s.id === "available" || s.id === "my-fulfillments") && currentUser.role === "KITCHEN") {
            return null;
          }
          return (
            <button
              key={s.id}
              onClick={() => setActiveScope(s.id as Scope)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 whitespace-nowrap transition duration-150 ${
                activeScope === s.id
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <DataTable
        headers={[
          "Nomor",
          "Peminta",
          "Tujuan",
          "Sumber",
          "Produk",
          "Quantity",
          "Status",
          "Action",
        ]}
        isLoading={isLoading}
      >
        {requests.map((r: any) => {
          const item = r.items?.[0];
          const productName = item?.materialVariant?.material?.name || "-";
          const quantity = item ? (item.requestedQuantity ? Number(item.requestedQuantity) : Number(item.quantity)) : 0;
          const displayUnit = item
            ? item.packagingVersion?.packagingConfiguration?.name || item.materialVariant?.name || "pcs"
            : "pcs";

          // Action flags
          const canClaim = r.status === "PENDING" && (currentUser.role === "ADMIN" || isWarehouseUser);
          const canShip = r.status === "FULFILLING" && (
            currentUser.role === "ADMIN" || 
            (isWarehouseUser && r.sourceWarehouseId === userWhId)
          );
          const canReceive = r.status === "SHIPPED" && (
            currentUser.role === "ADMIN" || 
            (isWarehouseUser && r.requestingWarehouseId === userWhId) ||
            (currentUser.role === "KITCHEN" && r.requestingWarehouse?.warehouseType === "KITCHEN_STORAGE")
          );
          const canAccept = r.status === "RECEIVED" && (
            currentUser.role === "ADMIN" || 
            (isWarehouseUser && r.requestingWarehouseId === userWhId) ||
            (currentUser.role === "KITCHEN" && r.requestingWarehouse?.warehouseType === "KITCHEN_STORAGE")
          );
          const canCancel = (r.status === "PENDING" || r.status === "FULFILLING") && (
            currentUser.role === "ADMIN" || 
            (isWarehouseUser && r.requestingWarehouseId === userWhId) ||
            (currentUser.role === "KITCHEN" && r.requestingWarehouse?.warehouseType === "KITCHEN_STORAGE")
          );

          return (
            <tr key={r.id} className="border-b border-border/40 hover:bg-zinc-800/10 animate-fade-in">
              <td className="px-6 py-4 text-xs font-bold text-text-secondary">{r.requestNumber}</td>
              <td className="px-6 py-4 text-xs text-text-primary">{r.requester?.fullName || "-"}</td>
              <td className="px-6 py-4 text-xs text-text-primary">{r.requestingWarehouse?.name}</td>
              <td className="px-6 py-4 text-xs text-text-primary">{r.sourceWarehouse?.name || "Belum Claim"}</td>
              <td className="px-6 py-4 text-xs text-text-primary">
                <div className="font-bold">{productName}</div>
                <div className="text-text-secondary text-[11px] mt-0.5">
                  Varian: {item?.materialVariant?.name || "-"} | Packaging: {item?.packagingVersion?.packagingConfiguration?.name || "Tidak ada"}
                </div>
              </td>
              <td className="px-6 py-4 text-xs font-mono text-text-primary">
                {quantity} {displayUnit}
              </td>
              <td className="px-6 py-4">{renderStatusBadge(r.status)}</td>
              <td className="px-6 py-4 text-xs font-medium">
                <div className="flex gap-2">
                  {canClaim && (
                    <IconButton
                      icon={CheckCircle}
                      label="Claim Permintaan"
                      onClick={() => {
                        setClaimItem(r);
                        if (isWarehouseUser && userWhId) {
                          setClaimSourceWarehouseId(userWhId);
                        }
                      }}
                      className="text-indigo-400 hover:bg-indigo-400/10 hover:text-indigo-300"
                    />
                  )}
                  {canShip && (
                    <IconButton
                      icon={Truck}
                      label="Kirim Permintaan"
                      onClick={() => setShipItem(r)}
                      className="text-purple-400 hover:bg-purple-400/10 hover:text-purple-300"
                    />
                  )}
                  {canReceive && (
                    <IconButton
                      icon={ArrowDownToLine}
                      label="Terima Permintaan"
                      onClick={() => setReceiveItem(r)}
                      className="text-teal-400 hover:bg-teal-400/10 hover:text-teal-300"
                    />
                  )}
                  {canAccept && (
                    <IconButton
                      icon={Check}
                      label="Setujui Permintaan"
                      onClick={() => setAcceptItem(r)}
                      className="text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
                    />
                  )}
                  {canCancel && (
                    <IconButton
                      icon={XCircle}
                      label="Batal"
                      onClick={() => setCancelItem(r)}
                      variant="danger"
                    />
                  )}
                  {!canClaim && !canShip && !canReceive && !canAccept && !canCancel && (
                    <span className="text-text-muted">-</span>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>

      {requests.length === 0 && !isLoading && (
        <div className="p-8 border border-border/60 bg-surface-secondary/20 text-center rounded-xl text-text-muted text-sm">
          Tidak ada data permintaan stok.
        </div>
      )}

      {/* Claim Modal (for admin/warehouse to pick source warehouse) */}
      {claimItem && (
        <Modal isOpen={!!claimItem} onClose={() => setClaimItem(null)} title="Claim Permintaan Stok">
          <form onSubmit={handleClaimSubmit} className="flex flex-col gap-4 text-left">
            <p className="text-xs text-text-secondary leading-relaxed">
              Anda akan bertanggung jawab untuk memproses permintaan berikut:
            </p>
            <div className="bg-zinc-900 border border-border/60 p-3 rounded-lg flex flex-col gap-1">
              <span className="text-xs text-text-muted font-bold">Produk / Quantity:</span>
              <span className="text-sm font-black text-text-primary">
                {claimItem.items?.[0]?.product?.name} ({claimItem.items?.[0]?.quantity} {claimItem.items?.[0]?.unit?.symbol})
              </span>
            </div>

            {currentUser.role === "ADMIN" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                  Gudang Sumber Penyuplai
                </label>
                <select
                  value={claimSourceWarehouseId}
                  onChange={(e) => setClaimSourceWarehouseId(e.target.value)}
                  className="bg-zinc-900 border border-border text-text-primary px-3 py-2 rounded-lg text-sm"
                  required
                >
                  <option value="">Pilih Gudang Sumber</option>
                  {warehouses
                    .filter((w) => w.id !== claimItem.requestingWarehouseId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-text-secondary font-bold">Gudang Pengirim:</span>
                <span className="text-sm font-black text-text-primary">
                  {warehouses.find((w) => w.id === claimSourceWarehouseId)?.name || "Gudang Anda"}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setClaimItem(null)} type="button">
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={!claimSourceWarehouseId}>
                Claim Sekarang
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm dialogs */}
      {shipItem && (
        <ConfirmDialog
          isOpen={!!shipItem}
          onClose={() => setShipItem(null)}
          onConfirm={handleShipConfirm}
          title="Kirim Barang"
          message={`Kirim barang untuk permintaan ${shipItem.requestNumber}? Tindakan ini akan langsung mendepresiasi stok di gudang asal.`}
          isConfirming={isShipping}
        />
      )}

      {receiveItem && (
        <ConfirmDialog
          isOpen={!!receiveItem}
          onClose={() => setReceiveItem(null)}
          onConfirm={handleReceiveConfirm}
          title="Konfirmasi Terima Fisik"
          message={`Konfirmasi bahwa pengiriman permintaan ${receiveItem.requestNumber} telah sampai secara fisik di gudang Anda?`}
          isConfirming={isReceiving}
        />
      )}

      {acceptItem && (
        <ConfirmDialog
          isOpen={!!acceptItem}
          onClose={() => setAcceptItem(null)}
          onConfirm={handleAcceptConfirm}
          title="Verifikasi & Terima Sistem"
          message={`Verifikasi dan masukkan barang permintaan ${acceptItem.requestNumber} ke dalam stok sistem Anda?`}
          isConfirming={isAccepting}
        />
      )}

      {cancelItem && (
        <ConfirmDialog
          isOpen={!!cancelItem}
          onClose={() => setCancelItem(null)}
          onConfirm={handleCancelConfirm}
          title="Batalkan Permintaan"
          message={`Apakah Anda yakin ingin membatalkan permintaan ${cancelItem.requestNumber}?`}
          isConfirming={isCancelling}
        />
      )}
    </div>
  );
}
