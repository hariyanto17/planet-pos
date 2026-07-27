import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useReceiveStockMutation } from "@/lib/api/inventoryApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

export const ReceiveStockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products = [],
  warehouses = [],
  onSuccess,
}) => {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [receiveStock, { isLoading }] = useReceiveStockMutation();

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

    try {
      await receiveStock({
        productId,
        warehouseId,
        quantity: qtyNum,
        remarks: remarks || undefined,
      }).unwrap();
      onSuccess();
      setProductId("");
      setWarehouseId("");
      setQuantity("");
      setRemarks("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Failed to receive stock");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive Stock">
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
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Quantity</label>
          <Input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 50 or 0.5"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Remarks</label>
          <Input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Document reference, invoice #, etc."
          />
        </div>

        <div className="flex justify-end gap-2 mt-2 border-t border-zinc-800/80 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Submit Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default ReceiveStockModal;
