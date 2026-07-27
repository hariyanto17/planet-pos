"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetWarehousesQuery, useRecordOpeningStockMutation } from "@/lib/api/inventoryApi";
import { useGetProductsQuery } from "@/lib/api/productApi";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { TEXT } from "@/lib/i18n/id";

interface RowItem {
  productId: string;
  quantity: number;
  remarks: string;
}

export default function OpeningStockPage() {
  const router = useRouter();

  // Queries
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useGetWarehousesQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery();
  const [recordOpeningStock, { isLoading: isSubmitting }] = useRecordOpeningStockMutation();

  // State
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState<RowItem[]>([
    { productId: "", quantity: 1, remarks: "Initial Stock" },
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
    setRows([...rows, { productId: "", quantity: 1, remarks: "Initial Stock" }]);
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
    const hasEmptyProduct = rows.some(r => !r.productId);
    if (hasEmptyProduct) {
      setErrorMsg("Semua baris produk harus dipilih.");
      return;
    }

    // Check duplicate products
    const productIds = rows.map(r => r.productId);
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
          productId: r.productId,
          quantity: r.quantity,
          remarks: r.remarks || "Stok Awal",
        })),
      }).unwrap();

      alert("Stok awal berhasil disimpan!");
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
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main form grid */}
        <div className="lg:col-span-2 flex flex-col gap-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Form Rincian Barang</h2>

          {/* Warehouse Selector */}
          <div className="flex flex-col gap-1.5 w-full md:w-1/2 mb-4">
            <label className="text-sm font-semibold text-zinc-300">Gudang Penerima</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm cursor-pointer"
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
            <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-bold text-zinc-500 uppercase px-1">
              <div className="col-span-5">Pilih Produk</div>
              <div className="col-span-2">Jumlah</div>
              <div className="col-span-4">Catatan</div>
              <div className="col-span-1 text-center">Aksi</div>
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-zinc-800/40 md:border-0 pb-4 md:pb-0">
                {/* Product selector */}
                <div className="col-span-1 md:col-span-5 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 md:hidden uppercase">Produk</label>
                  <select
                    value={row.productId}
                    onChange={(e) => handleRowChange(idx, "productId", e.target.value)}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 outline-none focus:border-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="">Pilih Produk...</option>
                    {trackableProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (SKU: {p.sku || "-"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 md:hidden uppercase">Kuantitas</label>
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                    className="px-3 py-2 bg-zinc-955 border border-zinc-800 rounded-lg text-zinc-100 outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* Remarks */}
                <div className="col-span-1 md:col-span-4 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 md:hidden uppercase">Catatan</label>
                  <input
                    type="text"
                    value={row.remarks}
                    placeholder="Misal: Stok Awal"
                    onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                    className="px-3 py-2 bg-zinc-955 border border-zinc-800 rounded-lg text-zinc-100 outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="col-span-1 md:col-span-1 flex items-center justify-center pt-3 md:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={rows.length === 1}
                    className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-start mt-2">
            <Button variant="ghost" onClick={handleAddRow} type="button">
              + Tambah Baris Produk
            </Button>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-zinc-100">Ringkasan Batch</h2>

          <div className="flex flex-col gap-3 py-2 border-y border-zinc-800/50 my-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Gudang Tujuan</span>
              <span className="font-semibold text-zinc-200">{selectedWarehouseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Macam Produk</span>
              <span className="font-bold text-indigo-400">{rows.filter(r => r.productId).length} Item</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Kuantitas</span>
              <span className="font-extrabold text-zinc-100">{totalQuantity}</span>
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
              className="w-full justify-center text-zinc-400 hover:text-zinc-200"
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
