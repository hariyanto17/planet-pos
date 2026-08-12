import React, { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useCreateStockRequestMutation } from "@/lib/api/inventoryApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useToast } from "@/components/ToastProvider";
import { getAvailableUnits, getDefaultUnit, formatConversionPreview } from "@/lib/utils/unitConversions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

export const CreateStockRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products = [],
  warehouses = [],
  onSuccess,
}) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const toast = useToast();
  const [requestingWarehouseId, setRequestingWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [createStockRequest, { isLoading }] = useCreateStockRequestMutation();

  useEffect(() => {
    if (currentUser?.role === "WAREHOUSE" && currentUser.warehouseId) {
      setRequestingWarehouseId(currentUser.warehouseId);
    }
  }, [currentUser]);

  const selectedProduct = products.find((p) => p.id === productId);
  const availableUnits = getAvailableUnits(selectedProduct);
  const compatibleUnits = availableUnits.map((u) => u.symbol);

  const handleProductChange = (val: string) => {
    setProductId(val);
    const prod = products.find((p) => p.id === val);
    setUnit(getDefaultUnit(prod));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!requestingWarehouseId) {
      setErrorMsg("Silakan pilih gudang peminta");
      return;
    }
    if (!productId) {
      setErrorMsg("Silakan pilih produk");
      return;
    }
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMsg("Quantity harus lebih besar dari 0");
      return;
    }

    try {
      await createStockRequest({
        requestingWarehouseId,
        items: [
          {
            productId,
            quantity: parsedQty,
            unit: unit || undefined,
          },
        ],
        notes: notes || undefined,
      }).unwrap();

      toast.success("Permintaan stok berhasil dibuat");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal membuat permintaan stok");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Permintaan Stok Baru">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg font-bold">
            {errorMsg}
          </div>
        )}

        {currentUser?.role === "ADMIN" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Gudang Peminta
            </label>
            <select
              value={requestingWarehouseId}
              onChange={(e) => setRequestingWarehouseId(e.target.value)}
              className="bg-zinc-900 border border-border text-text-primary px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              required
            >
              <option value="">Pilih Gudang</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Gudang Peminta
            </label>
            <div className="bg-zinc-800/50 border border-border/40 text-text-muted px-3 py-2 rounded-lg text-sm">
              {warehouses.find((w) => w.id === requestingWarehouseId)?.name || "Gudang Anda"}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
            Pilih Produk
          </label>
          <select
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="bg-zinc-900 border border-border text-text-primary px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            required
          >
            <option value="">Pilih Produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.baseUnit ? `(${p.baseUnit})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Quantity
            </label>
            <Input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          {compatibleUnits.length > 0 && (
            <div className="w-28 flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                Satuan
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="bg-zinc-900 border border-border text-text-primary px-3 py-2 rounded-lg text-sm h-[38px] focus:outline-none focus:border-indigo-500"
              >
                {compatibleUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {(() => {
          const preview = formatConversionPreview(selectedProduct, quantity ? parseFloat(quantity) : NaN, unit);
          if (preview) {
            return (
              <div className="text-xs text-emerald-500 font-semibold">
                Setara dengan: {preview}
              </div>
            );
          }
          return null;
        })()}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
            Catatan
          </label>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Sangat mendesak"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Batal
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Kirim Permintaan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
