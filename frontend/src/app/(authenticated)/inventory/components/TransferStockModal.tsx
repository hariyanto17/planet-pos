import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTransferStockMutation, useGetInventoryProductsQuery } from "@/lib/api/inventoryApi";
import { useGetPackagingByVariantQuery } from "@/lib/api/productApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

const getCurrentPackagingVersion = (packaging: any) =>
  packaging.versions?.find((version: any) => version.isActive && !version.effectiveTo) ?? null;

const selectClass = "w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm font-semibold disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed";

export const TransferStockModal: React.FC<Props> = ({ isOpen, onClose, products = [], warehouses = [], onSuccess }) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [packagingId, setPackagingId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [transferStock, { isLoading }] = useTransferStockMutation();

  // Load available stock in source warehouse
  const { data: sourceStocksData } = useGetInventoryProductsQuery(
    { warehouseId: sourceWarehouseId, limit: 100 },
    { skip: !sourceWarehouseId || !isOpen }
  );
  const sourceStocks = sourceStocksData?.data || [];

  const selectedProduct = products.find((product) => product.id === productId);
  const variants = selectedProduct?.variants?.filter((variant: any) => variant.isActive) ?? [];
  const selectedVariant = variants.find((variant: any) => variant.id === variantId);

  // Fetch packaging options
  const { data: packagingConfigurations = [], isLoading: isPackagingLoading } = useGetPackagingByVariantQuery(variantId, { skip: !variantId });
  const packagingOptions = useMemo(() => packagingConfigurations.filter((packaging: any) => packaging.isActive && getCurrentPackagingVersion(packaging)), [packagingConfigurations]);
  const selectedPackaging = packagingOptions.find((packaging: any) => packaging.id === packagingId);

  // Conversion calculations
  const packagingMultiplier = selectedPackaging ? Number(getCurrentPackagingVersion(selectedPackaging).conversionFactor) : 1;
  const variantMultiplier = selectedVariant ? Number(selectedVariant.quantityInBaseUnit) : 1;
  const receivedQuantity = Number(quantity);
  const normalizedQuantity = Number.isFinite(receivedQuantity) && receivedQuantity > 0 ? receivedQuantity * packagingMultiplier * variantMultiplier : 0;
  const baseUnit = selectedProduct?.baseUnit?.toLowerCase() || "unit";

  // Check available stock in source warehouse for the selected variant
  const matchingStock = sourceStocks.find((s: any) => s.id === variantId);
  const availableBaseQty = matchingStock ? Number(matchingStock.quantity) : 0;
  const availableInContext = availableBaseQty / (packagingMultiplier * variantMultiplier);

  const resetForm = () => {
    setProductId("");
    setVariantId("");
    setPackagingId("");
    setQuantity("");
    setRemarks("");
    setErrorMsg("");
  };

  const handleProductChange = (nextProductId: string) => {
    setProductId(nextProductId);
    setVariantId("");
    setPackagingId("");
  };

  const handleVariantChange = (nextVariantId: string) => {
    setVariantId(nextVariantId);
    setPackagingId("");
  };

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
    if (!productId || !variantId) {
      setErrorMsg("Pilih produk dan varian terlebih dahulu");
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Jumlah transfer harus positif");
      return;
    }
    if (qtyNum > availableInContext) {
      setErrorMsg(`Jumlah transfer melebihi stok tersedia (${availableInContext.toFixed(3)} ${selectedPackaging ? selectedPackaging.name : selectedVariant.name})`);
      return;
    }

    try {
      await transferStock({
        sourceWarehouseId,
        destinationWarehouseId,
        productId,
        variantId,
        packagingId: packagingId || undefined,
        quantity: qtyNum,
        notes: remarks || undefined,
      }).unwrap();
      onSuccess();
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal membuat transfer");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Stok">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Gudang Asal</label>
          <select
            value={sourceWarehouseId}
            onChange={(e) => setSourceWarehouseId(e.target.value)}
            disabled={currentUser?.role === "WAREHOUSE"}
            className={selectClass}
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
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Gudang Tujuan</label>
          <select
            value={destinationWarehouseId}
            onChange={(e) => setDestinationWarehouseId(e.target.value)}
            disabled={currentUser?.role === "KITCHEN"}
            className={selectClass}
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
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Produk</label>
          <select
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className={selectClass}
            required
          >
            <option value="">Pilih Produk...</option>
            {products.filter((p) => p.isActive).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Varian</label>
          <select
            value={variantId}
            onChange={(e) => handleVariantChange(e.target.value)}
            className={selectClass}
            disabled={!productId}
            required
          >
            <option value="">{productId ? "Pilih Varian..." : "Pilih produk terlebih dahulu"}</option>
            {variants.map((variant: any) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}{variant.sku ? ` (${variant.sku})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Packaging (opsional)</label>
          <select
            value={packagingId}
            onChange={(e) => setPackagingId(e.target.value)}
            className={selectClass}
            disabled={!variantId || isPackagingLoading || packagingOptions.length === 0}
          >
            <option value="">
              {!variantId
                ? "Pilih varian terlebih dahulu"
                : packagingOptions.length === 0
                ? "Tidak ada packaging aktif"
                : "Tanpa Packaging (per varian)"}
            </option>
            {packagingOptions.map((packaging: any) => {
              const version = getCurrentPackagingVersion(packaging);
              return (
                <option key={packaging.id} value={packaging.id}>
                  {packaging.name}{packaging.unitLabel ? ` - ${packaging.unitLabel}` : ""} × {Number(version.conversionFactor)} varian
                </option>
              );
            })}
          </select>
        </div>

        {sourceWarehouseId && variantId && (
          <div className="text-xs font-semibold text-text-secondary bg-surface-secondary/40 border border-border p-2.5 rounded-lg flex justify-between items-center">
            <span>Stok Tersedia di Gudang Asal:</span>
            <span className="text-indigo-400 font-mono font-bold text-sm">
              {availableInContext.toFixed(3)} {selectedPackaging ? selectedPackaging.name : selectedVariant?.name}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Jumlah</label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={selectedPackaging ? "Jumlah packaging" : "Jumlah varian"}
            required
          />
        </div>

        {selectedVariant && receivedQuantity > 0 && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            <strong>{receivedQuantity} {selectedPackaging ? selectedPackaging.name : selectedVariant.name}</strong> × {packagingMultiplier} × {variantMultiplier} {baseUnit} = <strong>{normalizedQuantity.toLocaleString()} {baseUnit}</strong>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Keterangan</label>
          <Input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Catatan transfer (opsional)"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2 border-t border-border/80 pt-4">
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
