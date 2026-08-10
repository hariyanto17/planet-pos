"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetOrderQuery } from "@/lib/api/orderApi";
import { Button } from "@/components/Button";
import { OrderStatus } from "@shared/types";
import { 
  Loader2, 
  Utensils, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  ArrowRight,
  Info,
  Clock,
  User,
  Coffee
} from "lucide-react";

import { TEXT } from "@/lib/i18n/id";

function WaitingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId") || "";

  const { data: order, isLoading, isError, refetch } = useGetOrderQuery(orderId, {
    skip: !orderId,
    pollingInterval: 4000,
  });

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
        <div className="max-w-md bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-2xl font-black">!</div>
          <h2 className="text-xl font-black tracking-tight text-zinc-100">Referensi Pesanan Tidak Ada</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">Silakan periksa tanda terima faktur Anda atau hubungi staf teater untuk menemukan ringkasan status.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-500" />
        <span className="text-zinc-400 text-sm font-semibold tracking-wide">Mengambil detail status pesanan...</span>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
        <div className="max-w-md bg-zinc-900/60 backdrop-blur-md border border-rose-500/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-2xl font-black">X</div>
          <h2 className="text-xl font-black tracking-tight text-zinc-100">Pesanan Tidak Ditemukan</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">Kami tidak dapat menemukan kode pesanan ini di database konsesi. Silakan berkonsultasi dengan staf teater.</p>
        </div>
      </div>
    );
  }

  // Steps tracking display: Preparing -> Ready -> Completed
  const steps: { key: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
    { 
      key: "PREPARING", 
      label: "Sedang Disiapkan", 
      desc: "Dapur sedang menyiapkan pesanan segar Anda",
      icon: <Coffee className="w-4 h-4" />
    },
    { 
      key: "READY", 
      label: "Siap Diambil", 
      desc: "Pesanan siap! Diantar ke meja / ambil di konter",
      icon: <Utensils className="w-4 h-4" />
    },
    { 
      key: "COMPLETED", 
      label: "Selesai", 
      desc: "Transaksi sukses. Selamat menikmati camilan Anda!",
      icon: <CheckCircle2 className="w-4 h-4" />
    },
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === "CANCELLED" || status === "NEW") return 0;
    return steps.findIndex((s) => s.key === status);
  };

  const currentStepIdx = getStepIndex(order.status as OrderStatus);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 max-w-lg mx-auto border-x border-zinc-900 shadow-2xl p-4 sm:p-5 gap-6 animate-fade-in relative pb-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* Ticket Design */}
      <div className="flex flex-col items-center text-center gap-3 mt-6 relative z-10">
        <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-850 p-6 rounded-3xl shadow-xl w-full max-w-[280px] sm:max-w-xs border border-indigo-500/20 overflow-hidden">
          {/* Cinema Ticket Perforated Corners */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950" />
          
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200/80">Planet Cinema Ticket</span>
            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-md select-all py-2 my-1">
              {order.displayNumber.split("-")[0]}
            </div>
            <span className="text-xxs font-mono text-indigo-200/60 bg-black/25 px-3 py-1.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-300" /> Polling aktif tiap 4s
            </span>
          </div>
        </div>
        
        <p className="text-zinc-400 text-xs max-w-xs leading-relaxed mt-2">
          Biarkan halaman ini tetap terbuka. Kami akan memperbarui status secara instan setelah dapur menyelesaikan masakan Anda.
        </p>
      </div>

      {/* Live Status Tracker */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-850/80 rounded-3xl p-5 flex flex-col gap-6 relative z-10">
        {order.status === "CANCELLED" ? (
          <div className="flex items-center gap-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-4">
            <XCircle className="w-6 h-6 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-bold">Pesanan Dibatalkan</span>
              <span className="text-xs opacity-80 leading-normal">Pesanan konsesi ini telah dibatalkan oleh staf atau sistem.</span>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col gap-6 pl-8">
            {/* Timeline Line */}
            <div className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-zinc-800" />
            
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="relative flex flex-col group">
                  {/* Step Bubble Indicator */}
                  <div
                    className={`absolute -left-[32px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      isCurrent
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/35 scale-110"
                        : isPast
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-950 border-zinc-850 text-zinc-650"
                    }`}
                  >
                    {step.icon}
                  </div>

                  <span
                    className={`text-sm font-black transition-colors ${
                      isCurrent ? "text-indigo-400" : isPast ? "text-zinc-200" : "text-zinc-550"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className={`text-xs mt-0.5 leading-relaxed transition-colors ${
                    isCurrent ? "text-zinc-400" : "text-zinc-550"
                  }`}>{step.desc}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fulfillment Summary */}
      <div className="flex flex-col gap-3 relative z-10">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" /> Ringkasan Pemenuhan
        </h3>
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-5 flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-500 font-semibold">Nama Pelanggan</span>
            <span className="text-zinc-250 font-bold">{order.customerName}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-500 font-semibold">Tipe Layanan</span>
            <span className="text-zinc-250 font-bold">
              {order.orderType === "DINE_IN" ? "Diantar ke Meja" : "Ambil Sendiri"}
            </span>
          </div>
          {order.table && (
            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-500 font-semibold">Lokasi Meja</span>
              <span className="text-indigo-400 font-black">{order.table.name}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-1 border-t border-zinc-900/60 mt-1 pt-2">
            <span className="text-zinc-500 font-semibold">Total Pembayaran</span>
            <span className="text-indigo-400 font-black text-base">Rp {Number(order.grandTotal).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Ordered Items list */}
      <div className="flex flex-col gap-3 relative z-10">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" /> Detail Keranjang
        </h3>
        <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-zinc-950 last:border-0 last:pb-0">
              <div className="flex flex-col">
                <span className="text-zinc-350 font-semibold">
                  {item.productName}
                </span>
                {item.note && <span className="text-amber-500 text-xxs mt-0.5">Catatan: {item.note}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 font-bold text-xs">x{item.quantity}</span>
                <span className="text-zinc-250 font-bold w-20 text-right">Rp {(Number(item.unitPrice) * item.quantity).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto pt-6 flex flex-col gap-3 relative z-10">
        <Button variant="ghost" onClick={() => refetch()} className="w-full py-3.5 font-bold hover:bg-zinc-900 rounded-xl border-zinc-800">
          Perbarui Status
        </Button>
        <Button
          onClick={() => {
            router.push(`/self-order?table=${order.tableId || ""}`);
          }}
          className="w-full py-4 font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/35 active:scale-[0.98] transition"
        >
          Pesan Makanan Lagi
        </Button>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-3" />
        <span className="text-zinc-400 text-sm font-semibold">Memuat status tiket...</span>
      </div>
    }>
      <WaitingContent />
    </Suspense>
  );
}
