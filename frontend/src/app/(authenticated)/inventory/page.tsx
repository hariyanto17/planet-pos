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
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { formatCurrency } from "@/utils/formatters";
import ReceiveStockModal from "./components/ReceiveStockModal";
import AdjustStockModal from "./components/AdjustStockModal";
import WasteStockModal from "./components/WasteStockModal";

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

  const isWritePermitted = currentUser.role === "ADMIN" || currentUser.role === "WAREHOUSE";

  const renderStatusBadge = (status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | string) => {
    switch (status) {
      case "IN_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            In Stock
          </span>
        );
      case "LOW_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Low Stock
          </span>
        );
      case "OUT_OF_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Out of Stock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            {status}
          </span>
        );
    }
  };

  const renderMovementBadge = (type: string) => {
    switch (type) {
      case "OPENING":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Opening</span>;
      case "RECEIVE":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Receive</span>;
      case "SALE":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sale</span>;
      case "ADJUSTMENT":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Adjustment</span>;
      case "WASTE":
        return <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Waste</span>;
      default:
        return <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{type}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">Warehouse Inventory Management</h1>
          <p className="text-zinc-500 text-sm">
            Auditable ledger-first stock tracking, manual adjustments, and cashier checkout sales logging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isWritePermitted && (
            <>
              <Button variant="secondary" onClick={() => setIsWasteOpen(true)}>
                Record Waste
              </Button>
              <Button variant="secondary" onClick={() => setIsAdjustOpen(true)}>
                Adjust Stock
              </Button>
              <Button variant="primary" onClick={() => setIsReceiveOpen(true)}>
                Receive Stock
              </Button>
            </>
          )}
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 transition"
            title="Reload Ledger"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            title: "Tracked Products",
            value: isSummaryLoading ? "..." : `${summary?.trackedProducts || 0} / ${summary?.totalProducts || 0}`,
            desc: "Active inventory items",
          },
          {
            title: "Inventory Valuation",
            value: isSummaryLoading ? "..." : formatCurrency(summary?.inventoryValue || 0),
            desc: "Asset value in stock",
          },
          {
            title: "Today's Movements",
            value: isSummaryLoading ? "..." : `${summary?.todayMovements || 0} Entries`,
            desc: "Transactions logged today",
          },
          {
            title: "Low Stock Items",
            value: isSummaryLoading ? "..." : summary?.lowStockProducts || 0,
            desc: "At or below threshold",
            color: (summary?.lowStockProducts || 0) > 0 ? "text-amber-400" : "text-zinc-400",
          },
          {
            title: "Out of Stock",
            value: isSummaryLoading ? "..." : summary?.outOfStockProducts || 0,
            desc: "Zero balance remaining",
            color: (summary?.outOfStockProducts || 0) > 0 ? "text-rose-400 font-extrabold" : "text-zinc-400",
          },
        ].map((c, i) => (
          <div key={i} className="p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-1.5 shadow">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">{c.title}</span>
            <span className={`text-xl font-black tracking-tight ${c.color || "text-zinc-100"}`}>{c.value}</span>
            <span className="text-zinc-500 text-[10px]">{c.desc}</span>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800/80 gap-1 overflow-x-auto pb-px">
        {[
          { id: "STOCK", label: "Current Stock" },
          { id: "MOVEMENTS", label: "Movement Ledger History" },
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
      <div className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:max-w-xs">
          <SearchInput
            value={search}
            onSearchChange={(val) => {
              setSearch(val);
              setStockPage(1);
              setMovementPage(1);
            }}
            placeholder="Search SKU or name..."
          />
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
          {/* Warehouse filter */}
          <select
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(e.target.value);
              setStockPage(1);
              setMovementPage(1);
            }}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none text-xs font-bold uppercase"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Conditional Filters depending on tab */}
          {activeTab === "STOCK" ? (
            <select
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value);
                setStockPage(1);
              }}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none text-xs font-bold uppercase"
            >
              <option value="">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out Of Stock</option>
            </select>
          ) : (
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setMovementPage(1);
              }}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none text-xs font-bold uppercase"
            >
              <option value="">All Movement Types</option>
              <option value="OPENING">Opening</option>
              <option value="RECEIVE">Receive</option>
              <option value="SALE">Sale</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="WASTE">Waste</option>
            </select>
          )}
        </div>
      </div>

      {/* Content display */}
      {activeTab === "STOCK" ? (
        <div className="flex flex-col gap-4">
          <DataTable
            headers={[
              "Product",
              "SKU",
              "Warehouse",
              "Current Quantity",
              "Min Stock Limit",
              "Status",
            ]}
            isLoading={isProductsLoading}
          >
            {productsList.map((p: any) => (
              <tr key={p.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/10">
                <td className="px-6 py-4 text-xs font-bold text-zinc-200">{p.name}</td>
                <td className="px-6 py-4 text-xs font-medium text-zinc-400 font-mono">{p.sku}</td>
                <td className="px-6 py-4 text-xs font-semibold text-zinc-300">{p.warehouseName}</td>
                <td className="px-6 py-4 text-xs font-extrabold text-zinc-100 font-mono">
                  {Number(p.quantity).toFixed(3)} <span className="text-[10px] text-zinc-500 font-normal">{p.unit}</span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-zinc-500 font-mono">
                  {Number(p.minimumStock).toFixed(3)}
                </td>
                <td className="px-6 py-4">{renderStatusBadge(p.status)}</td>
              </tr>
            ))}
          </DataTable>

          {productsList.length === 0 && !isProductsLoading && (
            <div className="p-8 border border-zinc-800/60 bg-zinc-950/20 text-center rounded-xl text-zinc-500 text-sm">
              No inventory stock records matching active filter criteria.
            </div>
          )}

          {productsPagination.totalPages > 1 && (
            <Pagination
              currentPage={stockPage}
              totalPages={productsPagination.totalPages}
              onPageChange={(p) => setStockPage(p)}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable
            headers={[
              "Date",
              "Warehouse",
              "Product Name",
              "Type",
              "Movement Quantity",
              "Balance After",
              "User Context",
              "Remarks",
            ]}
            isLoading={isMovementsLoading}
          >
            {movementsList.map((m: any) => (
              <tr key={m.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/10">
                <td className="px-6 py-4 text-[10px] font-bold text-zinc-500 font-mono">
                  {new Date(m.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-zinc-300">{m.warehouseName}</td>
                <td className="px-6 py-4 text-xs font-bold text-zinc-200">
                  {m.productName} <span className="text-[10px] text-zinc-500 font-mono">({m.sku})</span>
                </td>
                <td className="px-6 py-4">{renderMovementBadge(m.movementType)}</td>
                <td
                  className={`px-6 py-4 text-xs font-extrabold font-mono ${
                    m.quantity > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {m.quantity > 0 ? `+${m.quantity.toFixed(3)}` : m.quantity.toFixed(3)}
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-zinc-300 font-mono">
                  {m.quantityAfter.toFixed(3)}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-zinc-400">{m.createdBy}</td>
                <td className="px-6 py-4 text-xs text-zinc-500 truncate max-w-[200px]" title={m.remarks}>
                  {m.remarks}
                </td>
              </tr>
            ))}
          </DataTable>

          {movementsList.length === 0 && !isMovementsLoading && (
            <div className="p-8 border border-zinc-800/60 bg-zinc-950/20 text-center rounded-xl text-zinc-500 text-sm">
              No stock movements recorded for the selected search terms.
            </div>
          )}

          {movementsPagination.totalPages > 1 && (
            <Pagination
              currentPage={movementPage}
              totalPages={movementsPagination.totalPages}
              onPageChange={(p) => setMovementPage(p)}
            />
          )}
        </div>
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
    </div>
  );
}
