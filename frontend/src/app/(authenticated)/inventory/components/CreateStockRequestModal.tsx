import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useCreateStockRequestMutation, useGetInventoryProductsQuery } from "@/lib/api/inventoryApi";
import { useGetPackagingByVariantQuery } from "@/lib/api/productApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useToast } from "@/components/ToastProvider";
import { SearchableSelect } from "@/components/SearchableSelect";
import { getAvailableUnits, getConversionForUnit } from "@/lib/utils/unitConversions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  warehouses: any[];
  onSuccess: () => void;
}

const getCurrentPackagingVersion = (packaging: any) =>
  packaging.versions?.find((version: any) => version.isActive && !version.effectiveTo) ?? null;

export const CreateStockRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products = [],
  warehouses = [],
  onSuccess,
}) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const userWhId = currentUser?.warehouseId;
  const toast = useToast();

  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [packagingId, setPackagingId] = useState("");
  const [unit, setUnit] = useState("");
  const [requestingWarehouseId, setRequestingWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [createStockRequest, { isLoading }] = useCreateStockRequestMutation();

  const { data: requestingStocksData } = useGetInventoryProductsQuery(
    { warehouseId: requestingWarehouseId, limit: 100 },
    { skip: !requestingWarehouseId || !isOpen }
  );
  const requestingStocks = requestingStocksData?.data || [];

  useEffect(() => {
    if (currentUser?.role === "WAREHOUSE" && userWhId) {
      setRequestingWarehouseId(userWhId);
    }
  }, [currentUser, userWhId]);

  const resetForm = () => {
    setProductId("");
    setVariantId("");
    setPackagingId("");
    setUnit("");
    if (currentUser?.role !== "WAREHOUSE") {
      setRequestingWarehouseId("");
    }
    setQuantity("");
    setNotes("");
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

  useEffect(() => {
    if (selectedProduct) {
      setUnit(selectedProduct.baseUnit || "");
    } else {
      setUnit("");
    }
  }, [selectedProduct]);

  const availableUnits = useMemo(() => {
    const list = [...getAvailableUnits(selectedProduct)];
    if (selectedVariant && !list.some((u) => u.symbol.toUpperCase() === selectedVariant.name.toUpperCase())) {
      list.push({
        symbol: selectedVariant.name,
        baseQuantity: String(selectedVariant.quantityInBaseUnit),
        isDefault: false,
      });
    }
    return list;
  }, [selectedProduct, selectedVariant]);

  const selectedUnitConversion = useMemo(() => {
    if (selectedPackaging) {
      return { baseQuantity: String(packagingMultiplier * variantMultiplier) };
    }
    if (!selectedProduct || !unit) return null;

    if (selectedVariant && unit.toUpperCase() === selectedVariant.name.toUpperCase()) {
      return { baseQuantity: String(selectedVariant.quantityInBaseUnit) };
    }

    return getConversionForUnit(selectedProduct, unit);
  }, [selectedProduct, selectedPackaging, selectedVariant, unit, packagingMultiplier, variantMultiplier]);

  const unitMultiplier = selectedUnitConversion ? Number(selectedUnitConversion.baseQuantity) : 1;
  const matchingStock = requestingStocks.find((s: any) => s.id === variantId);
  const availableBaseQty = matchingStock ? Number(matchingStock.quantity) : 0;
  const availableInContext = availableBaseQty / unitMultiplier;

  const receivedQuantity = Number(quantity) || 0;
  const normalizedQuantity = receivedQuantity * unitMultiplier;

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

    if (!requestingWarehouseId) {
      setErrorMsg("Silakan pilih gudang peminta");
      return;
    }
    if (!productId || !variantId) {
      setErrorMsg("Silakan pilih produk dan varian terlebih dahulu");
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
            variantId,
            packagingId: packagingId || undefined,
            quantity: parsedQty,
            unit: selectedPackaging ? undefined : unit || undefined,
          },
        ],
        notes: notes || undefined,
      }).unwrap();

      toast.success("Permintaan stok berhasil dibuat");
      onSuccess();
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal membuat permintaan stok.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Permintaan Stok">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <SearchableSelect
          label="Gudang Peminta"
          value={requestingWarehouseId}
          onValueChange={setRequestingWarehouseId}
          disabled={currentUser?.role === "WAREHOUSE"}
          options={warehouses.map((w) => ({
            value: w.id,
            label: `${w.name} (${w.code})`,
          }))}
          placeholder="Pilih Gudang Peminta..."
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

        {requestingWarehouseId && variantId && (
          <div className="text-xs font-semibold text-text-secondary bg-surface-secondary/40 border border-border p-2.5 rounded-lg flex justify-between items-center">
            <span>Stok Tersedia di Gudang Peminta:</span>
            <span className="text-indigo-400 font-mono font-bold text-sm">
              {availableInContext.toFixed(3)} {selectedPackaging ? selectedPackaging.name : unit}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">Jumlah</label>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={selectedPackaging ? "Jumlah packaging" : "Jumlah permintaan"}
              required
            />
          </div>
          {!selectedPackaging && productId && availableUnits.length > 0 && (
            <div className="w-28 flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">Satuan</label>
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

        {selectedVariant && receivedQuantity > 0 && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400 flex flex-col gap-1 font-semibold">
            <div className="flex justify-between">
              <span>Request Quantity:</span>
              <span>{receivedQuantity} {selectedPackaging ? selectedPackaging.name : unit}</span>
            </div>
            <div className="flex justify-between border-t border-emerald-500/20 pt-1">
              <span>Converted Quantity:</span>
              <span>{normalizedQuantity.toLocaleString("id-ID")} {baseUnit}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Stock:</span>
              <span>{availableBaseQty.toLocaleString("id-ID")} {baseUnit}</span>
            </div>
            <div className="flex justify-between border-t border-emerald-500/20 pt-1">
              <span>Remaining Stock after Receipt:</span>
              <span>{(availableBaseQty + normalizedQuantity).toLocaleString("id-ID")} {baseUnit}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
            Catatan
          </label>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Sangat mendesak (opsional)"
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

export default CreateStockRequestModal;
