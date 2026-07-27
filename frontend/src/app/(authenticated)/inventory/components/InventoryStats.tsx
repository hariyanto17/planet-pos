import React from "react";
import { formatCurrency } from "@/utils/formatters";

import { TEXT } from "@/lib/i18n/id";

interface InventoryStatsProps {
  summary: any;
  isLoading: boolean;
}

export function InventoryStats({ summary, isLoading }: InventoryStatsProps) {
  const cards = [
    {
      title: TEXT.inventory.trackedCard,
      value: isLoading ? "..." : `${summary?.trackedProducts || 0} / ${summary?.totalProducts || 0}`,
      desc: "Item inventaris aktif",
    },
    {
      title: TEXT.inventory.valuationCard,
      value: isLoading ? "..." : formatCurrency(summary?.inventoryValue || 0),
      desc: "Nilai aset yang tersedia",
    },
    {
      title: TEXT.inventory.movementsCard,
      value: isLoading ? "..." : `${summary?.todayMovements || 0} Entri`,
      desc: "Transaksi yang dicatat hari ini",
    },
    {
      title: TEXT.inventory.lowStockCard,
      value: isLoading ? "..." : summary?.lowStockProducts || 0,
      desc: "Di bawah batas minimum",
      color: (summary?.lowStockProducts || 0) > 0 ? "text-amber-400 font-bold" : "text-zinc-400",
    },
    {
      title: TEXT.inventory.outOfStockCard,
      value: isLoading ? "..." : summary?.outOfStockProducts || 0,
      desc: "Saldo persediaan habis",
      color: (summary?.outOfStockProducts || 0) > 0 ? "text-rose-400 font-extrabold" : "text-zinc-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-1.5 shadow">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">{c.title}</span>
          <span className={`text-xl font-black tracking-tight ${c.color || "text-zinc-100"}`}>{c.value}</span>
          <span className="text-zinc-500 text-[10px]">{c.desc}</span>
        </div>
      ))}
    </div>
  );
}
