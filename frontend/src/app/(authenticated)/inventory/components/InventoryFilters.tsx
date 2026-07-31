import React from "react";
import { SearchInput } from "@/components/SearchInput";
import { TEXT } from "@/lib/i18n/id";

interface InventoryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedWarehouseId: string;
  onWarehouseChange: (value: string) => void;
  warehouses: any[];
  activeTab: "STOCK" | "MOVEMENTS";
  stockStatus?: string;
  onStockStatusChange?: (value: string) => void;
  movementType?: string;
  onMovementTypeChange?: (value: string) => void;
}

export function InventoryFilters({
  search,
  onSearchChange,
  selectedWarehouseId,
  onWarehouseChange,
  warehouses = [],
  activeTab,
  stockStatus = "",
  onStockStatusChange,
  movementType = "",
  onMovementTypeChange,
}: InventoryFiltersProps) {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
      <div className="w-full sm:max-w-xs">
        <SearchInput
          value={search}
          onSearchChange={onSearchChange}
          placeholder={TEXT.products.searchPlaceholder}
        />
      </div>
      <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
        {/* Warehouse filter */}
        <select
          value={selectedWarehouseId}
          onChange={(e) => onWarehouseChange(e.target.value)}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none text-xs font-bold uppercase"
        >
          <option value="">Semua Gudang</option>
          {warehouses.map((w: any) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {/* Conditional Filters depending on tab */}
        {activeTab === "STOCK" ? (
          onStockStatusChange && (
            <select
              value={stockStatus}
              onChange={(e) => onStockStatusChange(e.target.value)}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none text-xs font-bold uppercase"
            >
              <option value="">Semua Status</option>
              <option value="IN_STOCK">Tersedia</option>
              <option value="LOW_STOCK">Stok Menipis</option>
              <option value="OUT_OF_STOCK">Stok Habis</option>
              <option value="NEGATIVE_STOCK">Stok Negatif</option>
            </select>
          )
        ) : (
          onMovementTypeChange && (
            <select
              value={movementType}
              onChange={(e) => onMovementTypeChange(e.target.value)}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none text-xs font-bold uppercase"
            >
              <option value="">Semua Tipe Mutasi</option>
              <option value="OPENING">Stok Awal</option>
              <option value="RECEIVE">Penerimaan Barang</option>
              <option value="SALE">Penjualan</option>
              <option value="ADJUSTMENT">Penyesuaian Stok</option>
              <option value="WASTE">Barang Rusak</option>
            </select>
          )
        )}
      </div>
    </div>
  );
}
