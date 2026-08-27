"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetWarehousesQuery, useRecordOpeningStockMutation } from "@/lib/api/inventoryApi";
import { useGetProductsQuery } from "@/lib/api/productApi";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { getAvailableUnits, getDefaultUnit, formatConversionPreview } from "@/lib/utils/unitConversions";
import { AlertTriangle, Trash2 } from "lucide-react";

interface RowItem {
  materialVariantId: string;
  quantity: number;
  unit: string;
  remarks: string;
}

export default function OpeningStockPage() {
  const router = useRouter();
  const toast = useToast();

  // Queries
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useGetWarehousesQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery();
  const [recordOpeningStock, { isLoading: isSubmitting }] = useRecordOpeningStockMutation();

  // State
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState<RowItem[]>([
    { materialVariantId: "", quantity: 1, unit: "", remarks: "Initial Stock" },
  ]);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters: Only show products configured to track inventory
  const trackableProducts = useMemo(() => {
    return products.filter((p: any) => p.trackInventory);
  }, [products]);

  // Totals calculations
  const totalQuantity = useMemo(() => {
    return rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }, [rows]);

  const selectedWarehouseName = useMemo(() => {
    const w = warehouses.find((item: any) => item.id === warehouseId);
    return w ? w.name : "Belum terpilih";
  }, [warehouses, warehouseId]);

  // Actions
  const handleAddRow = () => {
    setRows([...rows, { materialVariantId: "", quantity: 1, unit: "", remarks: "Initial Stock" }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleRowChange = (index: number, field: keyof RowItem, value: any) => {
    const newRows = [...rows];
    if (field === "quantity") {
      newRows[index].quantity = Math.max(1, Number(value) || 0);
    } else if (field === "materialVariantId") {
      const product = products.find((p: any) => (p.materialVariantId ?? p.id) === value);
      newRows[index] = {
        ...newRows[index],
        materialVariantId: value,
        unit: getDefaultUnit(product),
      };
    } else {
      newRows[index] = { ...newRows[index], [field]: value };
    }
    setRows(newRows);
  };

  const handleSave = async () => {
    setErrorMsg("");

    // 1. Validation checks
    if (!warehouseId) {
      setErrorMsg("Silakan pilih gudang tujuan terlebih dahulu.");
      return;
    }

    if (rows.length === 0) {
      setErrorMsg("Silakan tambahkan minimal satu produk.");
      return;
    }

    // Check empty product selectors
    const hasEmptyProduct = rows.some(r => !r.materialVariantId);
    if (hasEmptyProduct) {
      setErrorMsg("Semua baris produk harus dipilih.");
      return;
    }

    // Check duplicate products
    const productIds = rows.map(r => r.materialVariantId);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      setErrorMsg("Duplicate products are not allowed in Opening Stock.");
      return;
    }

    // Check quantities
    const hasInvalidQty = rows.some(r => r.quantity <= 0);
    if (hasInvalidQty) {
      setErrorMsg("Jumlah kuantitas harus lebih besar dari nol.");
      return;
    }

    try {
      await recordOpeningStock({
        warehouseId,
        items: rows.map(r => ({
          materialVariantId: r.materialVariantId,
          quantity: r.quantity,
          unit: r.unit || undefined,
          remarks: r.remarks || "Stok Awal",
        })),
      }).unwrap();

      toast.success("Stok awal berhasil disimpan!");
      router.push("/warehouse/current-stock");
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal menyimpan stok awal.");
    }
  };

  const isLoading = isLoadingWarehouses || isLoadingProducts;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pencatatan Stok Awal (Opening Stock)"
        description="Lakukan input saldo awal persediaan barang ke gudang penempatan secara massal."
      />

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-400 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main form grid */}
        <div className="lg:col-span-2 flex flex-col gap-4 bg-surface border border-border/80 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-text-primary mb-2">Form Rincian Barang</h2>

          {/* Warehouse Selector */}
          <div className="flex flex-col gap-1.5 w-full md:w-1/2 mb-4">
            <label className="text-sm font-semibold text-text-primary">Gudang Penerima</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="px-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm cursor-pointer"
            >
              <option value="">Pilih Gudang...</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

            {/* Row entries */}
            <div className="flex flex-col gap-3">
              <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-bold text-text-muted uppercase px-1">
                <div className="col-span-4">Pilih Produk</div>
                <div className="col-span-2">Jumlah</div>
                <div className="col-span-2">Satuan</div>
                <div className="col-span-3">Catatan</div>
                <div className="col-span-1 text-center">Aksi</div>
              </div>

              {rows.map((row, idx) => {
                const product = products.find((p: any) => (p.materialVariantId ?? p.id) === row.materialVariantId);
                const availableUnits = getAvailableUnits(product);
                const preview = formatConversionPreview(product, row.quantity, row.unit);

                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-border/40 md:border-0 pb-4 md:pb-0">
                    {/* Product selector */}
                    <div className="col-span-1 md:col-span-4 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted md:hidden uppercase">Produk</label>
                      <select
                        value={row.materialVariantId}
                        onChange={(e) => handleRowChange(idx, "materialVariantId", e.target.value)}
                        className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm cursor-pointer"
                      >
                        <option value="">Pilih Produk...</option>
                        {trackableProducts.map((p: any) => (
                          <option key={p.materialVariantId ?? p.id} value={p.materialVariantId ?? p.id}>
                            {p.name} (SKU: {p.sku || "-"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted md:hidden uppercase">Kuantitas</label>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                        className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted md:hidden uppercase">Satuan</label>
                      <select
                        value={row.unit}
                        onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                        className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm cursor-pointer"
                        disabled={!row.materialVariantId}
                      >
                        <option value="">Pilih Satuan...</option>
                        {availableUnits.map((u) => (
                          <option key={u.symbol} value={u.symbol}>
                            {u.symbol}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remarks */}
                    <div className="col-span-1 md:col-span-3 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted md:hidden uppercase">Catatan</label>
                      <input
                        type="text"
                        value={row.remarks}
                        placeholder="Misal: Stok Awal"
                        onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                        className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 md:col-span-1 flex items-center justify-center pt-3 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length === 1}
                        className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Conversion preview */}
                    {preview && (
                      <div className="col-span-1 md:col-span-12">
                        <div className="text-xs text-emerald-500 font-semibold">
                          Setara dengan: {preview}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          <div className="flex items-center justify-start mt-2">
            <Button variant="ghost" onClick={handleAddRow} type="button">
              + Tambah Baris Produk
            </Button>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="flex flex-col gap-4 bg-surface border border-border/80 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-text-primary">Ringkasan Batch</h2>

          <div className="flex flex-col gap-3 py-2 border-y border-border/50 my-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Gudang Tujuan</span>
              <span className="font-semibold text-text-primary">{selectedWarehouseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Macam Produk</span>
              <span className="font-bold text-indigo-400">{rows.filter(r => r.materialVariantId).length} Item</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Kuantitas</span>
              <span className="font-extrabold text-text-primary">{totalQuantity}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleSave}
              isLoading={isSubmitting}
              className="w-full justify-center"
              disabled={isSubmitting || isLoading}
            >
              Simpan Stok Awal
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/warehouse/current-stock")}
              className="w-full justify-center text-text-secondary hover:text-text-primary"
              disabled={isSubmitting}
            >
              Kembali
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
