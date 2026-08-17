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
  const [requestingWarehouseId, setRequestingWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [createStockRequest, { isLoading }] = useCreateStockRequestMutation();

  // Load available stock in the requesting warehouse
  const { data: requestingStocksData } = useGetInventoryProductsQuery(
    { warehouseId: requestingWarehouseId, limit: 100 },
    { skip: !requestingWarehouseId || !isOpen }
  );
  const requestingStocks = requestingStocksData?.data || [];

  // If WAREHOUSE role, default requesting warehouse to their warehouseId
  useEffect(() => {
    if (currentUser?.role === "WAREHOUSE" && userWhId) {
      setRequestingWarehouseId(userWhId);
    }
  }, [currentUser, userWhId]);

  // Reset form helper
  const resetForm = () => {
    setProductId("");
    setVariantId("");
    setPackagingId("");
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

  const receivedQuantity = Number(quantity) || 0;
  const normalizedQuantity = receivedQuantity * packagingMultiplier * variantMultiplier;

  // Check available stock in requesting warehouse for the selected variant
  const matchingStock = requestingStocks.find((s: any) => s.id === variantId);
  const availableBaseQty = matchingStock ? Number(matchingStock.quantity) : 0;
  const availableInContext = availableBaseQty / (packagingMultiplier * variantMultiplier);

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
          },
        ],
        notes: notes || undefined,
      }).unwrap();

      toast.success("Permintaan stok berhasil dibuat");
      onSuccess();
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal membuat permintaan stok");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Permintaan Stok Baru">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        {currentUser?.role === "ADMIN" ? (
          <SearchableSelect
            label="Gudang Peminta"
            value={requestingWarehouseId}
            onValueChange={setRequestingWarehouseId}
            options={warehouses.map((w) => ({
              value: w.id,
              label: w.name,
            }))}
            placeholder="Pilih Gudang..."
          />
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
              {availableInContext.toFixed(3)} {selectedPackaging ? selectedPackaging.name : selectedVariant?.name}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
            Jumlah
          </label>
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
