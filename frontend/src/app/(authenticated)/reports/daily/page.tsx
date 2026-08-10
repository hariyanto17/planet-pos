"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useGetDailyAnalysisQuery } from "@/lib/api/reportsApi";
import { formatCurrency } from "@/utils/formatters";

export default function DailyAnalysisPage() {
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Authorization Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const { data, isLoading, refetch } = useGetDailyAnalysisQuery(
    { date: selectedDate },
    {
      skip: !currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING"),
    }
  );

  const report = data?.data || {
    summary: { totalSales: 0, totalTransactions: 0, averageTransactionValue: 0, cashSales: 0, qrisSales: 0 },
    hourlySales: [],
    topProducts: [],
    lowProducts: [],
    categorySales: [],
  };

  const { summary, hourlySales, topProducts, lowProducts, categorySales } = report;

  const cardList = [
    { title: "Total Penjualan", value: formatCurrency(summary.totalSales), desc: "Seluruh penjualan yang telah dibayar (PAID)", color: "text-emerald-400" },
    { title: "Jumlah Transaksi", value: `${summary.totalTransactions} Pesanan`, desc: "Total kuantitas pesanan yang berhasil dicheckout", color: "text-zinc-200" },
    { title: "Rata-rata Transaksi", value: formatCurrency(summary.averageTransactionValue), desc: "Rata-rata nilai belanja per transaksi", color: "text-indigo-400" },
    { title: "Penjualan Tunai", value: formatCurrency(summary.cashSales), desc: "Total pembayaran cash yang dikonfirmasi", color: "text-amber-400" },
    { title: "Penjualan QRIS", value: formatCurrency(summary.qrisSales), desc: "Total pembayaran digital QRIS", color: "text-sky-400" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Analisis Harian</h1>
          <p className="text-zinc-400 text-sm mt-1">Laporan detail penjualan harian berdasarkan tanggal bisnis.</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
          <span className="text-zinc-400 text-xs font-bold uppercase pl-2">Tanggal Bisnis</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-800 text-zinc-100 rounded-lg p-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cardList.map((card, idx) => (
          <div key={idx} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{card.title}</span>
            {isLoading ? (
              <div className="h-9 w-2/3 bg-zinc-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <span className={`text-xl font-black ${card.color} tracking-tight`}>{card.value}</span>
            )}
            <p className="text-zinc-500 text-xs mt-1 font-medium leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Analysis Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Sales */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-4 shadow lg:col-span-2">
          <h2 className="text-lg font-bold tracking-tight text-zinc-200">Jam Sibuk Bisnis</h2>
          {isLoading ? (
            <div className="h-48 bg-zinc-800/50 animate-pulse rounded-xl" />
          ) : hourlySales.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Tidak ada transaksi tercatat untuk hari ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-xs uppercase bg-zinc-800/80 text-zinc-500 font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Jam</th>
                    <th className="py-3 px-4">Jumlah Transaksi</th>
                    <th className="py-3 px-4 text-right">Total Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {hourlySales.map((row: any) => (
                    <tr key={row.hour} className="hover:bg-zinc-850">
                      <td className="py-3 px-4 font-bold text-zinc-200">{row.hour}:00</td>
                      <td className="py-3 px-4">{row.transactionCount} Pesanan</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">{formatCurrency(row.salesAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-4 shadow">
          <h2 className="text-lg font-bold tracking-tight text-zinc-200">Komposisi Kategori</h2>
          {isLoading ? (
            <div className="h-48 bg-zinc-800/50 animate-pulse rounded-xl" />
          ) : categorySales.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Belum ada data kategori.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {categorySales.map((cat: any) => (
                <div key={cat.category} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                  <div>
                    <div className="font-bold text-zinc-200 text-sm">{cat.category}</div>
                    <div className="text-zinc-500 text-xs mt-1">{cat.quantity} pcs terjual</div>
                  </div>
                  <div className="text-emerald-400 font-bold text-sm">{formatCurrency(cat.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-4 shadow lg:col-span-2">
          <h2 className="text-lg font-bold tracking-tight text-zinc-200">🏆 Produk Terlaris</h2>
          {isLoading ? (
            <div className="h-48 bg-zinc-800/50 animate-pulse rounded-xl" />
          ) : topProducts.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Belum ada data produk terlaris.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-xs uppercase bg-zinc-800/80 text-zinc-500 font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 w-16">Peringkat</th>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-4">Jumlah Terjual</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {topProducts.slice(0, 10).map((row: any) => (
                    <tr key={row.ranking} className="hover:bg-zinc-850">
                      <td className="py-3 px-4 font-black text-emerald-400 text-center">#{row.ranking}</td>
                      <td className="py-3 px-4 font-bold text-zinc-200">{row.product}</td>
                      <td className="py-3 px-4">{row.qty} pcs</td>
                      <td className="py-3 px-4 text-right text-zinc-300 font-bold">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Products */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-4 shadow">
          <h2 className="text-lg font-bold tracking-tight text-zinc-200">💤 Slow Moving Products</h2>
          {isLoading ? (
            <div className="h-48 bg-zinc-800/50 animate-pulse rounded-xl" />
          ) : lowProducts.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Belum ada data slow moving products.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {lowProducts.slice(0, 5).map((row: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                  <div>
                    <div className="font-bold text-zinc-200 text-sm">{row.product}</div>
                    <div className="text-zinc-500 text-xs mt-1">{row.qty} pcs terjual</div>
                  </div>
                  <div className="text-zinc-400 font-medium text-sm">{formatCurrency(row.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
