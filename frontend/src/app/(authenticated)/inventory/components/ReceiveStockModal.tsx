import React, { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useReceiveStockMutation } from "@/lib/api/inventoryApi";
import { useGetPackagingByVariantQuery } from "@/lib/api/productApi";
import { SearchableSelect } from "@/components/SearchableSelect";
import { TEXT } from "@/lib/i18n/id";

interface Props { isOpen: boolean; onClose: () => void; products: any[]; warehouses: any[]; onSuccess: () => void; }

const getCurrentPackagingVersion = (packaging: any) =>
  packaging.versions?.find((version: any) => version.isActive && !version.effectiveTo) ?? null;

export const ReceiveStockModal: React.FC<Props> = ({ isOpen, onClose, products = [], warehouses = [], onSuccess }) => {
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [packagingId, setPackagingId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [receiveStock, { isLoading }] = useReceiveStockMutation();

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

  const resetForm = () => { setProductId(""); setVariantId(""); setPackagingId(""); setWarehouseId(""); setQuantity(""); setNote(""); setErrorMsg(""); };
  const handleProductChange = (nextProductId: string) => { setProductId(nextProductId); setVariantId(""); setPackagingId(""); };
  const handleVariantChange = (nextVariantId: string) => { setVariantId(nextVariantId); setPackagingId(""); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setErrorMsg("");
    if (!productId || !variantId || !warehouseId) return setErrorMsg("Pilih produk, varian, dan gudang terlebih dahulu");
    if (!Number.isFinite(receivedQuantity) || receivedQuantity <= 0) return setErrorMsg("Masukkan jumlah penerimaan positif");
    try {
      await receiveStock({ productId, variantId, packagingId: packagingId || undefined, warehouseId, quantity: receivedQuantity, receivedUnit: selectedPackaging?.unitLabel || selectedPackaging?.name || selectedVariant?.name, note: note || undefined }).unwrap();
      onSuccess(); resetForm(); onClose();
    } catch (err: any) { setErrorMsg(err?.data?.message || "Gagal menerima stok"); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} title={TEXT.inventory.receiveBtn}>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errorMsg && <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">⚠️ {errorMsg}</div>}
      
      <SearchableSelect
        label="Produk"
        value={productId}
        onValueChange={handleProductChange}
        options={products.filter((product) => product.isActive).map((product) => ({
          value: product.id,
          label: product.name,
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

      <SearchableSelect
        label="Gudang"
        value={warehouseId}
        onValueChange={setWarehouseId}
        options={warehouses.map((warehouse) => ({
          value: warehouse.id,
          label: `${warehouse.name} (${warehouse.code})`,
        }))}
        placeholder="Pilih Gudang..."
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Jumlah Diterima</label>
        <Input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={selectedPackaging ? "Jumlah packaging" : "Jumlah varian"} required />
      </div>

      {selectedVariant && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{receivedQuantity > 0 ? <><strong>{receivedQuantity} {selectedPackaging ? selectedPackaging.name : selectedVariant.name}</strong> × {packagingMultiplier} × {variantMultiplier} {baseUnit} = <strong>+{normalizedQuantity.toLocaleString()} {baseUnit}</strong></> : "Masukkan jumlah untuk melihat stok yang akan ditambahkan."}</div>}
      
      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Catatan (opsional)</label>
        <Input type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Referensi dokumen, nomor faktur, dll." />
      </div>

      <div className="flex justify-end gap-2 mt-2 border-t border-border/80 pt-4"><Button variant="secondary" onClick={onClose} type="button">{TEXT.common.cancel}</Button><Button variant="primary" type="submit" isLoading={isLoading}>Kirim Penerimaan</Button></div>
    </form>
  </Modal>;
};

export default ReceiveStockModal;
