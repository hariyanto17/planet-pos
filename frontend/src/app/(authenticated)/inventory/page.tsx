"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import {
  useGetInventorySummaryQuery,
  useGetInventoryProductsQuery,
  useGetStockMovementsQuery,
  useGetWarehousesQuery,
} from "@/lib/api/inventoryApi";
import { Button } from "@/components/Button";
import { InventoryStats } from "./components/InventoryStats";
import { InventoryFilters } from "./components/InventoryFilters";
import { InventoryStockTable } from "./components/InventoryStockTable";
import { InventoryMovementTable } from "./components/InventoryMovementTable";
import ReceiveStockModal from "./components/ReceiveStockModal";
import AdjustStockModal from "./components/AdjustStockModal";
import WasteStockModal from "./components/WasteStockModal";
import TransferStockModal from "./components/TransferStockModal";
import { TEXT } from "@/lib/i18n/id";

type Tab = "STOCK" | "MOVEMENTS";

export default function InventoryPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState<Tab>("STOCK");

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [movementType, setMovementType] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);

  // Modals state
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Queries
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useGetInventorySummaryQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();

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

  const {
    data: movementsData,
    isLoading: isMovementsLoading,
    refetch: refetchMovements,
  } = useGetStockMovementsQuery({
    search: search || undefined,
    warehouseId: selectedWarehouseId || undefined,
    movementType: movementType || undefined,
    page: movementPage,
    limit: 10,
  });

  const productsList = productsData?.data || [];
  const movementsList = movementsData?.data || [];
  const productsPagination = productsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };
  const movementsPagination = movementsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };

  const handleRefresh = () => {
    refetchSummary();
    refetchProducts();
    refetchMovements();
  };

  if (!currentUser) return null;

  const isWritePermitted = currentUser.role === "ADMIN";

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">{TEXT.inventory.title}</h1>
          <p className="text-zinc-500 text-sm">
            {TEXT.inventory.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isWritePermitted && (
            <>
              <Button variant="secondary" onClick={() => setIsWasteOpen(true)}>
                {TEXT.inventory.wasteBtn}
              </Button>
              <Button variant="secondary" onClick={() => setIsTransferOpen(true)}>
                Transfer
              </Button>
              <Button variant="secondary" onClick={() => setIsAdjustOpen(true)}>
                {TEXT.inventory.adjustBtn}
              </Button>
              <Button variant="primary" onClick={() => setIsReceiveOpen(true)}>
                {TEXT.inventory.receiveBtn}
              </Button>
            </>
          )}
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 transition"
            title={TEXT.inventory.reloadBtn}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <InventoryStats summary={summary} isLoading={isSummaryLoading} />

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800/80 gap-1 overflow-x-auto pb-px">
        {[
          { id: "STOCK", label: TEXT.inventory.tabStock },
          { id: "MOVEMENTS", label: TEXT.inventory.tabMovements },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition duration-150 ${
              activeTab === t.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      <InventoryFilters
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setStockPage(1);
          setMovementPage(1);
        }}
        selectedWarehouseId={selectedWarehouseId}
        onWarehouseChange={(val) => {
          setSelectedWarehouseId(val);
          setStockPage(1);
          setMovementPage(1);
        }}
        warehouses={warehouses}
        activeTab={activeTab}
        stockStatus={stockStatus}
        onStockStatusChange={(val) => {
          setStockStatus(val);
          setStockPage(1);
        }}
        movementType={movementType}
        onMovementTypeChange={(val) => {
          setMovementType(val);
          setMovementPage(1);
        }}
      />

      {/* Content display */}
      {activeTab === "STOCK" ? (
        <InventoryStockTable
          productsList={productsList}
          isLoading={isProductsLoading}
          stockPage={stockPage}
          totalPages={productsPagination.totalPages}
          onPageChange={(p) => setStockPage(p)}
        />
      ) : (
        <InventoryMovementTable
          movementsList={movementsList}
          isLoading={isMovementsLoading}
          movementPage={movementPage}
          totalPages={movementsPagination.totalPages}
          onPageChange={(p) => setMovementPage(p)}
        />
      )}

      {/* Operations Dialogs */}
      {isReceiveOpen && (
        <ReceiveStockModal
          isOpen={isReceiveOpen}
          onClose={() => setIsReceiveOpen(false)}
          products={productsList}
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
