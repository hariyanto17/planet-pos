import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useRemoveWasteMutation } from "@/lib/api/inventoryApi";
import { TEXT } from "@/lib/i18n/id";
import { getAvailableUnits, getDefaultUnit, formatConversionPreview } from "@/lib/utils/unitConversions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

export const WasteStockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products = [],
  warehouses = [],
  onSuccess,
}) => {
  const [materialVariantId, setMaterialVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [removeWaste, { isLoading }] = useRemoveWasteMutation();

  const selectedProduct = products.find((p) => (p.materialVariantId ?? p.id) === materialVariantId);
  const availableUnits = getAvailableUnits(selectedProduct);

  const handleProductChange = (val: string) => {
    setMaterialVariantId(val);
    const prod = products.find((p) => (p.materialVariantId ?? p.id) === val);
    setUnit(getDefaultUnit(prod));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!materialVariantId) {
      setErrorMsg("Silakan pilih produk");
      return;
    }
    if (!warehouseId) {
      setErrorMsg("Silakan pilih gudang");
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Silakan masukkan jumlah desimal positif");
      return;
    }

    try {
      await removeWaste({
        materialVariantId,
        warehouseId,
        quantity: qtyNum,
        unit: unit || undefined,
        remarks: remarks || undefined,
      }).unwrap();
      onSuccess();
      setMaterialVariantId("");
      setWarehouseId("");
      setQuantity("");
      setUnit("");
      setRemarks("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal mencatat barang rusak");
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
    <Modal isOpen={isOpen} onClose={onClose} title={TEXT.inventory.wasteBtn}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Produk</label>
          <select
            value={materialVariantId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm font-semibold"
            required
          >
            <option value="">Pilih Produk...</option>
            {uniqueProducts.map((p) => (
              <option key={p.materialVariantId ?? p.id} value={p.materialVariantId ?? p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Gudang</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm font-semibold"
            required
          >
            <option value="">Pilih Gudang...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Jumlah</label>
            <Input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Misal: 5 atau 0.25"
              required
            />
          </div>
          {materialVariantId && availableUnits.length > 0 && (
            <div className="w-28 flex flex-col gap-1.5">
              <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Satuan</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm font-semibold h-[42px]"
                required
              >
                {availableUnits.map((u) => (
                  <option key={u.symbol} value={u.symbol}>
                    {u.symbol}
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
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Alasan Kerusakan</label>
          <Input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Basi, kedaluwarsa, tumpah, dll."
            required
          />
        </div>

        <div className="flex justify-end gap-2 mt-2 border-t border-border/80 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            {TEXT.common.cancel}
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {TEXT.inventory.wasteBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default WasteStockModal;
