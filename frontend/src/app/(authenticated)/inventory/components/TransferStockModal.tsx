import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTransferStockMutation, useGetInventoryProductsQuery } from "@/lib/api/inventoryApi";
import { useGetPackagingByVariantQuery } from "@/lib/api/productApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { SearchableSelect } from "@/components/SearchableSelect";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

const getCurrentPackagingVersion = (packaging: any) =>
  packaging.versions?.find((version: any) => version.isActive && !version.effectiveTo) ?? null;

export const TransferStockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products = [],
  warehouses = [],
  onSuccess,
}) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const userWhId = currentUser?.warehouseId;

  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [packagingId, setPackagingId] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [transferStock, { isLoading }] = useTransferStockMutation();

  // If WAREHOUSE role, fix source warehouse and set default view to MASUK/KELUAR context
  useEffect(() => {
    if (currentUser?.role === "WAREHOUSE" && userWhId) {
      setSourceWarehouseId(userWhId);
    }
  }, [currentUser, userWhId]);

  // Reset form helper
  const resetForm = () => {
    setProductId("");
    setVariantId("");
    setPackagingId("");
    if (currentUser?.role !== "WAREHOUSE") {
      setSourceWarehouseId("");
    }
    setDestinationWarehouseId("");
    setQuantity("");
    setRemarks("");
    setErrorMsg("");
  };

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [productId, products]);
  const variants = useMemo(() => selectedProduct?.variants ?? [], [selectedProduct]);
  const selectedVariant = useMemo(() => variants.find((v: any) => v.id === variantId), [variantId, variants]);

  const { data: packagings = [], isLoading: isPackagingLoading } = useGetPackagingByVariantQuery(variantId, { skip: !variantId });
  const packagingOptions = useMemo(() => packagings.filter((pkg: any) => pkg.isActive), [packagings]);
  const selectedPackaging = useMemo(() => packagingOptions.find((p: any) => p.id === packagingId), [packagingId, packagingOptions]);

  const packagingMultiplier = selectedPackaging ? Number(getCurrentPackagingVersion(selectedPackaging)?.conversionFactor ?? 1) : 1;
  const variantMultiplier = selectedVariant ? Number(selectedVariant.quantityInBaseUnit ?? 1) : 1;
  const baseUnit = selectedProduct?.baseUnit ?? "";

  const receivedQuantity = Number(quantity) || 0;
  const normalizedQuantity = receivedQuantity * packagingMultiplier * variantMultiplier;

  // Retrieve current stock availability at source warehouse in Context Unit (Varian / Packaging)
  const availableInContext = useMemo(() => {
    if (!sourceWarehouseId || !selectedVariant) return 0;
    const inventoryItem = selectedVariant.inventories?.find((inv: any) => inv.warehouseId === sourceWarehouseId);
    const stockInBaseUnit = inventoryItem ? Number(inventoryItem.quantity) : 0;
    // Divide base stock by cumulative multiplier to get packaging/variant count
    const unitDivisor = packagingMultiplier * variantMultiplier;
    return stockInBaseUnit / unitDivisor;
  }, [sourceWarehouseId, selectedVariant, packagingMultiplier, variantMultiplier]);

  const handleProductChange = (nextProductId: string) => {
    setProductId(nextProductId);
    setVariantId("");
    setPackagingId("");
  };

  const handleVariantChange = (nextVariantId: string) => {
    setVariantId(nextVariantId);
    setPackagingId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!productId || !variantId || !sourceWarehouseId || !destinationWarehouseId) {
      setErrorMsg("Harap pilih produk, varian, gudang asal, dan gudang tujuan.");
      return;
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      setErrorMsg("Gudang asal dan gudang tujuan tidak boleh sama.");
      return;
    }

    if (receivedQuantity <= 0) {
      setErrorMsg("Jumlah transfer harus lebih besar dari 0.");
      return;
    }

    if (receivedQuantity > availableInContext) {
      setErrorMsg(`Stok tidak mencukupi. Tersedia: ${availableInContext.toFixed(3)}.`);
      return;
    }

    try {
      await transferStock({
        productId,
        variantId,
        packagingId: packagingId || undefined,
        sourceWarehouseId,
        destinationWarehouseId,
        quantity: receivedQuantity,
        notes: remarks || undefined,
      }).unwrap();
      onSuccess();
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal membuat transfer stok.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Transfer Stok">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <SearchableSelect
          label="Gudang Asal"
          value={sourceWarehouseId}
          onValueChange={setSourceWarehouseId}
          disabled={currentUser?.role === "WAREHOUSE"}
          options={warehouses.map((w) => ({
            value: w.id,
            label: `${w.name} (${w.code})`,
          }))}
          placeholder="Pilih Gudang Asal..."
        />

        <SearchableSelect
          label="Gudang Tujuan"
          value={destinationWarehouseId}
          onValueChange={setDestinationWarehouseId}
          disabled={currentUser?.role === "KITCHEN"}
          options={warehouses.map((w) => ({
            value: w.id,
            label: `${w.name} (${w.code})`,
          }))}
          placeholder="Pilih Gudang Tujuan..."
        />

        <SearchableSelect
          label="Produk"
          value={productId}
          onValueChange={handleProductChange}
          options={products.filter((p) => p.isActive).map((p) => ({
            value: p.id,
            label: p.name,
          }))}
          placeholder="Pilih Produk..."
        />

        <SearchableSelect
          label="Varian"
          value={variantId}
          onValueChange={handleVariantChange}
          disabled={!productId}
          options={variants.map((variant: any) => ({
            value: variant.id,
            label: `${variant.name}${variant.sku ? ` (${variant.sku})` : ""}`,
          }))}
          placeholder={productId ? "Pilih Varian..." : "Pilih produk terlebih dahulu"}
        />

        <SearchableSelect
          label="Packaging (opsional)"
          value={packagingId}
          onValueChange={setPackagingId}
          disabled={!variantId || isPackagingLoading || packagingOptions.length === 0}
          options={packagingOptions.map((packaging: any) => {
            const version = getCurrentPackagingVersion(packaging);
            return {
              value: packaging.id,
              label: `${packaging.name}${packaging.unitLabel ? ` - ${packaging.unitLabel}` : ""} × ${Number(version.conversionFactor)} varian`,
            };
          })}
          placeholder={!variantId ? "Pilih varian terlebih dahulu" : packagingOptions.length === 0 ? "Tidak ada packaging aktif" : "Tanpa Packaging (per varian)"}
        />

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
