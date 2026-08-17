"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import {
  useGetInventorySummaryQuery,
  useGetInventoryProductsQuery,
  useGetWarehousesQuery,
} from "@/lib/api/inventoryApi";
import { useGetMaterialsQuery } from "@/lib/api/productApi";
import { Button } from "@/components/Button";
import { InventoryStats } from "../../inventory/components/InventoryStats";
import { InventoryFilters } from "../../inventory/components/InventoryFilters";
import { InventoryStockTable } from "../../inventory/components/InventoryStockTable";
import ReceiveStockModal from "../../inventory/components/ReceiveStockModal";
import AdjustStockModal from "../../inventory/components/AdjustStockModal";
import WasteStockModal from "../../inventory/components/WasteStockModal";
import TransferStockModal from "../../inventory/components/TransferStockModal";
import { InventoryTransferTable } from "../../inventory/components/InventoryTransferTable";
import { TEXT } from "@/lib/i18n/id";

export default function WarehouseCurrentStockPage() {
  const currentUser = useAppSelector(selectCurrentUser);

  // Filters State
  const [activeTab, setActiveTab] = useState<"STOCK" | "TRANSFERS">("STOCK");
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [stockPage, setStockPage] = useState(1);

  // Modals state
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Queries
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useGetInventorySummaryQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: materials = [] } = useGetMaterialsQuery();

  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useGetInventoryProductsQuery({
    search: search || undefined,
    warehouseId: selectedWarehouseId || undefined,
    stockStatus: stockStatus || undefined,
    page: stockPage,
    limit: 10,
  });

  const productsList = productsData?.data || [];
  const productsPagination = productsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };

  const handleRefresh = () => {
    refetchSummary();
    refetchProducts();
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-text-primary">{TEXT.warehouse.currentStockTitle}</h1>
          <p className="text-text-muted text-sm">
            {TEXT.warehouse.currentStockSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsTransferOpen(true)}>
            Transfer
          </Button>
          <Button variant="secondary" onClick={() => setIsWasteOpen(true)}>
            {TEXT.inventory.wasteBtn}
          </Button>
          <Button variant="secondary" onClick={() => setIsAdjustOpen(true)}>
            {TEXT.inventory.adjustBtn}
          </Button>
          <Button variant="primary" onClick={() => setIsReceiveOpen(true)}>
            {TEXT.inventory.receiveBtn}
          </Button>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-zinc-800 text-text-secondary hover:text-text-primary rounded-lg border border-border transition"
            title={TEXT.inventory.reloadBtn}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <InventoryStats summary={summary} isLoading={isSummaryLoading} />

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/80 gap-1 overflow-x-auto pb-px">
        {[
          { id: "STOCK", label: TEXT.inventory.tabStock },
          { id: "TRANSFERS", label: "Transfer" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as "STOCK" | "TRANSFERS")}
            className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition duration-150 ${
              activeTab === t.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {activeTab === "STOCK" && (
        <InventoryFilters
          search={search}
          onSearchChange={(val: string) => {
            setSearch(val);
            setStockPage(1);
          }}
          selectedWarehouseId={selectedWarehouseId}
          onWarehouseChange={(val: string) => {
            setSelectedWarehouseId(val);
            setStockPage(1);
          }}
          warehouses={warehouses}
          activeTab="STOCK"
          stockStatus={stockStatus}
          onStockStatusChange={(val: string) => {
            setStockStatus(val);
            setStockPage(1);
          }}
        />
      )}

      {/* Content display */}
      {activeTab === "STOCK" ? (
        <InventoryStockTable
          productsList={productsList}
          isLoading={isProductsLoading}
          stockPage={stockPage}
          totalPages={productsPagination.totalPages}
          onPageChange={(p: number) => setStockPage(p)}
        />
      ) : (
        <InventoryTransferTable onSuccess={handleRefresh} />
      )}

      {/* Operations Dialogs */}
      {isReceiveOpen && (
        <ReceiveStockModal
          isOpen={isReceiveOpen}
          onClose={() => setIsReceiveOpen(false)}
          products={materials}
          warehouses={warehouses}
          onSuccess={handleRefresh}
        />
      )}

      {isAdjustOpen && (
        <AdjustStockModal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          products={productsList}
          warehouses={warehouses}
          onSuccess={handleRefresh}
        />
      )}

      {isWasteOpen && (
        <WasteStockModal
          isOpen={isWasteOpen}
          onClose={() => setIsWasteOpen(false)}
          products={productsList}
          warehouses={warehouses}
          onSuccess={handleRefresh}
        />
      )}

      {isTransferOpen && (
        <TransferStockModal
          isOpen={isTransferOpen}
          onClose={() => setIsTransferOpen(false)}
          products={productsList}
          warehouses={warehouses}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
