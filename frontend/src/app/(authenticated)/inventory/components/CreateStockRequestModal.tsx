import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useCreateStockRequestMutation, useGetInventoryProductsQuery } from "@/lib/api/inventoryApi";
import { useGetPackagingByVariantQuery } from "@/lib/api/productApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useToast } from "@/components/ToastProvider";

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
  const [variantId, setVariantId] = useState("");
  const [packagingId, setPackagingId] = useState("");
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

  // Check available stock in requesting warehouse for the selected variant
  const matchingStock = requestingStocks.find((s: any) => s.id === variantId);
  const availableBaseQty = matchingStock ? Number(matchingStock.quantity) : 0;
  const availableInContext = availableBaseQty / (packagingMultiplier * variantMultiplier);

  const resetForm = () => {
    setProductId("");
    setVariantId("");
    setPackagingId("");
    setQuantity("");
    setNotes("");
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
        setRequestingWarehouseId(currentUser.warehouseId);
      }
      if (currentUser?.role === "KITCHEN") {
        const defaultKitchen = warehouses.find(
          (w) => w.warehouseType === "KITCHEN_STORAGE" && w.isDefaultKitchenStorage
        );
        if (defaultKitchen) {
          setRequestingWarehouseId(defaultKitchen.id);
        }
      }
    }
  }, [isOpen, currentUser, warehouses]);

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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Gudang Peminta
            </label>
            <select
              value={requestingWarehouseId}
              onChange={(e) => setRequestingWarehouseId(e.target.value)}
              className={selectClass}
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
            Produk
          </label>
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
          <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
            Varian
          </label>
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
          <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
            Packaging (opsional)
          </label>
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
