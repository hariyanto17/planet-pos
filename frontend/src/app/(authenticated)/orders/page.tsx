"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useOrders } from "@/features/orders/hooks/useOrders";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { PaymentStatusBadge } from "@/features/orders/components/PaymentStatusBadge";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/Button";
import { DatePicker } from "@/components/DatePicker";
import { Pagination } from "@/components/Pagination";
import { formatCurrency, formatOrderNumber, formatRelativeTime } from "@/utils/formatters";
import { TEXT } from "@/lib/i18n/id";
import { AlertTriangle } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);

  // Authorization Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const {
    orders,
    pagination,
    isLoading,
    isError,
    filters,
    updateFilter,
    resetFilters,
    refetch,
  } = useOrders();

  if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
    return null; // Prevents layout flashing
  }

  // Calculate items pagination range indices
  const startIdx = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(pagination.page * pagination.limit, pagination.totalItems);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-text-primary">{TEXT.orders.title}</h1>
          <p className="text-text-muted text-sm">
            {TEXT.orders.subtitle}
          </p>
        </div>
        <Button variant="secondary" onClick={refetch} isLoading={isLoading}>
          Perbarui Antrean
        </Button>
      </div>

      {/* Filters Card */}
      <div className="p-5 bg-surface border border-border/80 rounded-2xl flex flex-col gap-4 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Text Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{TEXT.common.search}</label>
            <input
              type="text"
              placeholder={TEXT.orders.searchPlaceholder}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder-zinc-650 outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Fulfillment Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Fulfillment</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm animate-fade-in"
            >
              <option value="">{TEXT.orders.allStatuses}</option>
              <option value="PREPARING">DISIAPKAN</option>
              <option value="READY">SIAP</option>
              <option value="COMPLETED">SELESAI</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Status Pembayaran</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => updateFilter("paymentStatus", e.target.value)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
            >
              <option value="">{TEXT.orders.allStatuses}</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Metode Pembayaran</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => updateFilter("paymentMethod", e.target.value)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
            >
              <option value="">SEMUA METODE</option>
              <option value="CASH">CASH</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Sumber Pesanan</label>
            <select
              value={filters.source}
              onChange={(e) => updateFilter("source", e.target.value)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
            >
              <option value="">{TEXT.orders.allSources}</option>
              <option value="SELF_ORDER">SELF ORDER</option>
              <option value="CASHIER">CASHIER</option>
            </select>
          </div>

          {/* Business Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Tanggal Operasional</label>
            <select
              value={filters.businessDate}
              onChange={(e) => updateFilter("businessDate", e.target.value as any)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
            >
              <option value="ALL">SEMUA TANGGAL</option>
              <option value="TODAY">HARI INI</option>
              <option value="YESTERDAY">KEMARIN</option>
              <option value="CUSTOM">PILIH TANGGAL</option>
            </select>
          </div>

          {/* Sorting Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Urutkan Berdasarkan</label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter("sortBy", e.target.value as any)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
            >
              <option value="createdAt">WAKTU DIBUAT</option>
              <option value="displayNumber">KODE TAMPILAN</option>
              <option value="grandTotal">GRAND TOTAL</option>
              <option value="businessDate">TANGGAL BISNIS</option>
            </select>
          </div>

          {/* Sorting Direction */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Arah Urutan</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => updateFilter("sortOrder", e.target.value as any)}
              className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none focus:border-indigo-500 text-sm"
            >
              <option value="desc">TERBARU / TERBESAR PERTAMA</option>
              <option value="asc">TERLAMA / TERKECIL PERTAMA</option>
            </select>
          </div>

          {/* Reset Action */}
          <div className="flex items-end">
            <Button variant="secondary" onClick={resetFilters} className="w-full">
              Reset Filter
            </Button>
          </div>
        </div>

        {/* Custom Date Inputs if CUSTOM is selected */}
        {filters.businessDate === "CUSTOM" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/60 pt-4">
            <DatePicker
              label="Tanggal Mulai"
              value={filters.customDateStart || ""}
              onChange={(val) => updateFilter("customDateStart", val)}
            />
            <DatePicker
              label="Tanggal Selesai"
              value={filters.customDateEnd || ""}
              onChange={(val) => updateFilter("customDateEnd", val)}
            />
          </div>
        )}
      </div>

      {/* Showing pagination numbers summary */}
      {!isError && (
        <div className="text-xs text-text-muted font-bold uppercase tracking-widest pl-2">
          Menampilkan {startIdx}-{endIdx} dari {pagination.totalItems} transaksi
        </div>
      )}

      {/* Error handling retry card */}
      {isError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-2xl text-center shadow-lg max-w-md mx-auto mt-6 gap-4">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-text-primary font-bold">Gagal memuat antrean pesanan</h2>
            <p className="text-text-muted text-xs">Silakan verifikasi koneksi server Anda dan coba lagi.</p>
          </div>
          <Button variant="primary" onClick={refetch}>
            Coba Lagi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable
            headers={[
              "Nomor Tampilan",
              "Nama Pelanggan",
              "Meja",
              "Sumber",
              "Tipe",
              "Pembayaran",
              "Status Pembayaran",
              "Fulfillment",
              "Grand Total",
              "Waktu Pembuatan",
            ]}
            isLoading={isLoading}
          >
            {orders.map((order: any) => {
              const latestPayment = order.payments?.[0];
              const paymentMethod = latestPayment?.method || "CASH";
              const paymentStatus = latestPayment?.status || "PENDING";

              return (
                <tr
                  key={order.id}
                  className="border-b border-border/50 hover:bg-surface/20 transition"
                >
                  <td className="px-6 py-4 text-sm font-bold text-indigo-400">
                    <Link href={`/orders/${order.id}`} className="hover:underline">
                      {formatOrderNumber(order.displayNumber)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary font-medium">
                    {order.customerName}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {order.table?.name || "Walk-in"}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-secondary border border-border font-semibold">
                      {order.source === "SELF_ORDER" ? "SELF ORDER" : "CASHIER"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {order.orderType === "DINE_IN" ? "Makan di Tempat" : "Bawa Pulang"}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-text-primary">
                    {paymentMethod}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <PaymentStatusBadge status={paymentStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-text-primary">
                    {formatCurrency(order.grandTotal)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted font-medium">
                    {formatRelativeTime(order.createdAt)}
                  </td>
                </tr>
              );
            })}
          </DataTable>

          {orders.length === 0 && !isLoading && (
            <div className="p-12 border border-border bg-surface/40 rounded-xl text-center text-text-muted text-sm">
              {TEXT.orders.noOrders}
            </div>
          )}

          {/* Pagination Component */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => updateFilter("page", page)}
          />
        </div>
      )}
    </div>
  );
}
