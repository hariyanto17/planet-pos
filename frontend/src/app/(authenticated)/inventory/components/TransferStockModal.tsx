import React, { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTransferStockMutation } from "@/lib/api/inventoryApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

export const TransferStockModal: React.FC<Props> = ({ isOpen, onClose, products = [], warehouses = [], onSuccess }) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [transferStock, { isLoading }] = useTransferStockMutation();

  useEffect(() => {
    if (isOpen) {
      if (currentUser?.role === "WAREHOUSE" && currentUser.warehouseId) {
        setSourceWarehouseId(currentUser.warehouseId);
      }
      if (currentUser?.role === "KITCHEN") {
        const defaultKitchen = warehouses.find(
          (w) => w.warehouseType === "KITCHEN_STORAGE" && w.isDefaultKitchenStorage
        );
        if (defaultKitchen) {
          setDestinationWarehouseId(defaultKitchen.id);
        }
      }
    }
  }, [isOpen, currentUser, warehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!sourceWarehouseId || !destinationWarehouseId) {
      setErrorMsg("Pilih sumber dan tujuan gudang");
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      setErrorMsg("Sumber dan tujuan gudang tidak boleh sama");
      return;
    }
    if (!productId) {
      setErrorMsg("Pilih produk");
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Jumlah transfer harus positif");
      return;
    }

    try {
      await transferStock({
        sourceWarehouseId,
        destinationWarehouseId,
        items: [{ productId, quantity: qtyNum }],
        remarks: remarks || undefined,
      }).unwrap();
      onSuccess();
      setSourceWarehouseId("");
      setDestinationWarehouseId("");
      setProductId("");
      setQuantity("");
      setRemarks("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal membuat transfer");
    }
  };

  const uniqueProducts = React.useMemo(() => {
    const seen = new Set();
    return products.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [products]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Stok">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Gudang Asal</label>
          <select
            value={sourceWarehouseId}
            onChange={(e) => setSourceWarehouseId(e.target.value)}
            disabled={currentUser?.role === "WAREHOUSE"}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-sm font-semibold disabled:opacity-50"
            required
          >
            <option value="">Pilih Gudang Asal...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Gudang Tujuan</label>
          <select
            value={destinationWarehouseId}
            onChange={(e) => setDestinationWarehouseId(e.target.value)}
            disabled={currentUser?.role === "KITCHEN"}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-sm font-semibold disabled:opacity-50"
            required
          >
            <option value="">Pilih Gudang Tujuan...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Produk</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-sm font-semibold"
            required
          >
            <option value="">Pilih Produk...</option>
            {uniqueProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Jumlah</label>
          <Input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Misal: 20 atau 0.5"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Keterangan</label>
          <Input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Catatan transfer"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2 border-t border-zinc-800/80 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Batal
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Buat Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransferStockModal;
