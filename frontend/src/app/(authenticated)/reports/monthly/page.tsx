"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useGetMonthlyAnalysisQuery } from "@/lib/api/reportsApi";
import { formatCurrency } from "@/utils/formatters";

const monthsList = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const yearsList = [2024, 2025, 2026, 2027, 2028];

export default function MonthlyAnalysisPage() {
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Authorization Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const { data, isLoading } = useGetMonthlyAnalysisQuery(
    { month: selectedMonth, year: selectedYear },
    {
      skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
    }
  );

  const report = data?.data || {
    businessPeriod: { startStr: "", endStr: "" },
    summary: { totalSales: 0, totalTransactions: 0, averageTransactionValue: 0, cashSales: 0, qrisSales: 0 },
    dailySalesTrend: [],
    topProducts: [],
    categorySales: [],
  };

  const { summary, dailySalesTrend, topProducts, categorySales, businessPeriod } = report;

  const cardList = [
    { title: "Total Penjualan", value: formatCurrency(summary.totalSales), desc: "Total penjualan bersih terkumpul", color: "text-emerald-500 dark:text-emerald-400" },
    { title: "Jumlah Transaksi", value: `${summary.totalTransactions} Pesanan`, desc: "Total kuantitas pesanan terkumpul", color: "text-text-primary" },
    { title: "Rata-rata Transaksi", value: formatCurrency(summary.averageTransactionValue), desc: "Rata-rata belanja per pesanan", color: "text-indigo-600 dark:text-indigo-400" },
    { title: "Penjualan Tunai", value: formatCurrency(summary.cashSales), desc: "Total pembayaran cash yang diterima", color: "text-amber-600 dark:text-amber-400" },
    { title: "Penjualan QRIS", value: formatCurrency(summary.qrisSales), desc: "Total pembayaran digital QRIS", color: "text-sky-600 dark:text-sky-400" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Selector Row */}
      <div className="flex justify-end items-center gap-3">
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-2 shadow-sm">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-surface text-text-primary rounded-lg p-2 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-surface text-text-primary rounded-lg p-2 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {yearsList.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Period Indicator */}
      {businessPeriod?.startStr && (
        <div className="p-4 bg-surface border border-border rounded-xl text-text-secondary text-xs shadow-sm">
          Periode Analisis: <span className="font-bold text-text-primary">{businessPeriod.startStr}</span> s/d <span className="font-bold text-text-primary">{businessPeriod.endStr}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cardList.map((card, idx) => (
          <div key={idx} className="p-5 bg-surface border border-border rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow-sm">
            <span className="text-text-muted text-xs font-bold uppercase tracking-wider">{card.title}</span>
            {isLoading ? (
              <div className="h-9 w-2/3 bg-surface-secondary animate-pulse rounded-lg mt-1" />
            ) : (
              <span className={`text-xl font-black ${card.color} tracking-tight`}>{card.value}</span>
            )}
            <p className="text-text-secondary text-xs mt-1 font-medium leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Trend */}
        <div className="p-6 bg-surface border border-border rounded-2xl flex flex-col gap-4 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold tracking-tight text-text-primary">Tren Penjualan Harian</h2>
          {isLoading ? (
            <div className="h-48 bg-surface-secondary/50 animate-pulse rounded-xl" />
          ) : dailySalesTrend.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">Tidak ada penjualan tercatat untuk periode ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text-secondary">
                <thead className="text-xs uppercase bg-surface-secondary text-text-muted font-bold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jumlah Transaksi</th>
                    <th className="py-3 px-4 text-right">Total Penjualan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dailySalesTrend.map((row: any) => (
                    <tr key={row.date} className="hover:bg-surface-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-text-primary">{row.date}</td>
                      <td className="py-3 px-4">{row.transactionCount} Pesanan</td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(row.salesAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="p-6 bg-surface border border-border rounded-2xl flex flex-col gap-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-text-primary">Kategori Terlaris</h2>
          {isLoading ? (
            <div className="h-48 bg-surface-secondary/50 animate-pulse rounded-xl" />
          ) : categorySales.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">Belum ada data kategori.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {categorySales.map((cat: any) => (
                <div key={cat.category} className="flex justify-between items-center p-3 bg-background rounded-xl border border-border">
                  <div>
                    <div className="font-bold text-text-primary text-sm">{cat.category}</div>
                    <div className="text-text-muted text-xs mt-1">{cat.quantity} pcs terjual</div>
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{formatCurrency(cat.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="p-6 bg-surface border border-border rounded-2xl flex flex-col gap-4 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-bold tracking-tight text-text-primary">🏆 Top 10 Produk Terlaris Bulanan</h2>
          {isLoading ? (
            <div className="h-48 bg-surface-secondary/50 animate-pulse rounded-xl" />
          ) : topProducts.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">Belum ada data produk terlaris.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text-secondary">
                <thead className="text-xs uppercase bg-surface-secondary text-text-muted font-bold border-b border-border">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Peringkat</th>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4">Kuantitas Terjual</th>
                    <th className="py-3 px-4 text-right">Revenue Bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topProducts.slice(0, 10).map((row: any) => (
                    <tr key={row.ranking} className="hover:bg-surface-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400 text-center">#{row.ranking}</td>
                      <td className="py-3 px-4 font-bold text-text-primary">{row.product}</td>
                      <td className="py-3 px-4">{row.qty} pcs</td>
                      <td className="py-3 px-4 text-right text-text-secondary font-bold">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
