import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAdjustStockMutation } from "@/lib/api/inventoryApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

export const AdjustStockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products = [],
  warehouses = [],
  onSuccess,
}) => {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [adjustType, setAdjustType] = useState<"INCREASE" | "DECREASE">("INCREASE");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [adjustStock, { isLoading }] = useAdjustStockMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!productId) {
      setErrorMsg("Please select a product");
      return;
    }
    if (!warehouseId) {
      setErrorMsg("Please select a warehouse");
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Please enter a positive decimal quantity");
      return;
    }

    // signed quantity: positive for increase, negative for decrease
    const finalQuantity = adjustType === "INCREASE" ? qtyNum : -qtyNum;

    try {
      await adjustStock({
        productId,
        warehouseId,
        quantity: finalQuantity,
        remarks: remarks || undefined,
      }).unwrap();
      onSuccess();
      setProductId("");
      setWarehouseId("");
      setQuantity("");
      setRemarks("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Failed to adjust stock");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock Adjustment">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-sm font-semibold"
            required
          >
            <option value="">Select Product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Warehouse</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-sm font-semibold"
            required
          >
            <option value="">Select Warehouse...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Adjustment Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdjustType("INCREASE")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition ${
                adjustType === "INCREASE"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              ➕ Increase (+Qty)
            </button>
            <button
              type="button"
              onClick={() => setAdjustType("DECREASE")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition ${
                adjustType === "DECREASE"
                  ? "bg-amber-600 text-white border-amber-600 shadow-md"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              ➖ Decrease (-Qty)
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Quantity</label>
          <Input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 10 or 2.5"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Reason / Remarks</label>
          <Input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Correction, lost, broken, etc."
          />
        </div>

        <div className="flex justify-end gap-2 mt-2 border-t border-zinc-800/80 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Apply Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default AdjustStockModal;
