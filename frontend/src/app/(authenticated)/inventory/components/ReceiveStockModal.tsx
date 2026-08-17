import React, { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useReceiveStockMutation } from "@/lib/api/inventoryApi";
import { useGetPackagingByVariantQuery } from "@/lib/api/productApi";
import { TEXT } from "@/lib/i18n/id";

interface Props { isOpen: boolean; onClose: () => void; products: any[]; warehouses: any[]; onSuccess: () => void; }

const getCurrentPackagingVersion = (packaging: any) =>
  packaging.versions?.find((version: any) => version.isActive && !version.effectiveTo) ?? null;
const selectClass = "w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm font-semibold disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed";

export const ReceiveStockModal: React.FC<Props> = ({ isOpen, onClose, products = [], warehouses = [], onSuccess }) => {
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [packagingId, setPackagingId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [receiveStock, { isLoading }] = useReceiveStockMutation();

  const selectedProduct = products.find((product) => product.id === productId);
  const variants = selectedProduct?.variants?.filter((variant: any) => variant.isActive) ?? [];
  const selectedVariant = variants.find((variant: any) => variant.id === variantId);
  const { data: packagingConfigurations = [], isLoading: isPackagingLoading } = useGetPackagingByVariantQuery(variantId, { skip: !variantId });
  const packagingOptions = useMemo(() => packagingConfigurations.filter((packaging: any) => packaging.isActive && getCurrentPackagingVersion(packaging)), [packagingConfigurations]);
  const selectedPackaging = packagingOptions.find((packaging: any) => packaging.id === packagingId);
  const packagingMultiplier = selectedPackaging ? Number(getCurrentPackagingVersion(selectedPackaging).conversionFactor) : 1;
  const variantMultiplier = selectedVariant ? Number(selectedVariant.quantityInBaseUnit) : 1;
  const receivedQuantity = Number(quantity);
  const normalizedQuantity = Number.isFinite(receivedQuantity) && receivedQuantity > 0 ? receivedQuantity * packagingMultiplier * variantMultiplier : 0;
  const baseUnit = selectedProduct?.baseUnit?.toLowerCase() || "unit";

  const resetForm = () => {
    setProductId(""); setVariantId(""); setPackagingId(""); setWarehouseId(""); setQuantity(""); setNote(""); setErrorMsg("");
  };
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
      <Field label="Produk"><select value={productId} onChange={(event) => handleProductChange(event.target.value)} className={selectClass} required><option value="">Pilih Produk...</option>{products.filter((product) => product.isActive).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
      <Field label="Varian"><select value={variantId} onChange={(event) => handleVariantChange(event.target.value)} className={selectClass} disabled={!productId} required><option value="">{productId ? "Pilih Varian..." : "Pilih produk terlebih dahulu"}</option>{variants.map((variant: any) => <option key={variant.id} value={variant.id}>{variant.name}{variant.sku ? ` (${variant.sku})` : ""}</option>)}</select></Field>
      <Field label="Packaging (opsional)"><select value={packagingId} onChange={(event) => setPackagingId(event.target.value)} className={selectClass} disabled={!variantId || isPackagingLoading || packagingOptions.length === 0}><option value="">{!variantId ? "Pilih varian terlebih dahulu" : packagingOptions.length === 0 ? "Tidak ada packaging aktif" : "Tanpa Packaging (per varian)"}</option>{packagingOptions.map((packaging: any) => { const version = getCurrentPackagingVersion(packaging); return <option key={packaging.id} value={packaging.id}>{packaging.name}{packaging.unitLabel ? ` - ${packaging.unitLabel}` : ""} × {Number(version.conversionFactor)} varian</option>; })}</select></Field>
      <Field label="Gudang"><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className={selectClass} required><option value="">Pilih Gudang...</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}</select></Field>
      <Field label="Jumlah Diterima"><Input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={selectedPackaging ? "Jumlah packaging" : "Jumlah varian"} required /></Field>
      {selectedVariant && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{receivedQuantity > 0 ? <><strong>{receivedQuantity} {selectedPackaging ? selectedPackaging.name : selectedVariant.name}</strong> × {packagingMultiplier} × {variantMultiplier} {baseUnit} = <strong>+{normalizedQuantity.toLocaleString()} {baseUnit}</strong></> : "Masukkan jumlah untuk melihat stok yang akan ditambahkan."}</div>}
      <Field label="Catatan (opsional)"><Input type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Referensi dokumen, nomor faktur, dll." /></Field>
      <div className="flex justify-end gap-2 mt-2 border-t border-border/80 pt-4"><Button variant="secondary" onClick={onClose} type="button">{TEXT.common.cancel}</Button><Button variant="primary" type="submit" isLoading={isLoading}>Kirim Penerimaan</Button></div>
    </form>
  </Modal>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="flex flex-col gap-1.5"><label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{label}</label>{children}</div>; }

export default ReceiveStockModal;
