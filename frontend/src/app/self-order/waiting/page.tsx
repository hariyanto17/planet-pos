"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetOrderQuery } from "@/lib/api/orderApi";
import { Button } from "@/components/Button";
import { OrderStatus } from "@shared/types";

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
        <div className="max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">!</div>
          <h2 className="text-xl font-bold text-zinc-100">Missing Order Reference</h2>
          <p className="text-zinc-400 text-sm">Please check your invoice receipt or contact theatrical staff to locate status summaries.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <svg className="animate-spin h-10 w-10 text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-zinc-400 text-sm font-medium">Fetching order status details...</span>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
        <div className="max-w-md bg-zinc-900 border border-rose-500/20 rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">X</div>
          <h2 className="text-xl font-bold text-zinc-100">Order Not Found</h2>
          <p className="text-zinc-400 text-sm">We are unable to locate this order code in the concessions database. Please consult theatrical staff.</p>
        </div>
      </div>
    );
  }

  // Steps tracking display: Preparing -> Ready -> Completed
  const steps: { key: OrderStatus; label: string; desc: string }[] = [
    { key: "PREPARING", label: "Preparing", desc: "Kitchen is preparing your concessions" },
    { key: "READY", label: "Ready", desc: "Concessions ready! Delivered to table / pick up at counter" },
    { key: "COMPLETED", label: "Completed", desc: "Enjoy your movie snacks!" },
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === "CANCELLED" || status === "NEW") return 0; // fallback early stages to Preparing
    return steps.findIndex((s) => s.key === status);
  };

  const currentStepIdx = getStepIndex(order.status as OrderStatus);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 max-w-lg mx-auto border-x border-zinc-900 shadow-2xl p-5 gap-6">
      <div className="flex flex-col items-center text-center gap-2 mt-4">
        <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-2xl animate-pulse">
          {order.displayNumber.split("-")[0]}
        </div>
        <h1 className="text-2xl font-black tracking-tight mt-2">Ticket: {order.displayNumber.split("-")[0]}</h1>
        <p className="text-zinc-400 text-sm">Keep this page open. It updates automatically when kitchen reports ready.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-6">
        {order.status === "CANCELLED" ? (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg p-3">
            <span className="text-lg font-bold">!</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Order Cancelled</span>
              <span className="text-xs opacity-80">This concessions order has been cancelled by staff.</span>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col gap-6 pl-6 border-l border-zinc-850">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="relative flex flex-col">
                  <div
                    className={`absolute -left-[30px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                      isCurrent
                        ? "bg-indigo-600 border-indigo-600/35 ring-4 ring-indigo-500/10"
                        : isPast
                        ? "bg-emerald-500 border-emerald-500/20"
                        : "bg-zinc-950 border-zinc-800"
                    }`}
                  />

                  <span
                    className={`text-sm font-bold ${
                      isCurrent ? "text-indigo-400 font-black" : isPast ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-xs text-zinc-500 mt-0.5">{step.desc}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fulfillment Summary</h3>
        <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Customer Name</span>
            <span className="text-zinc-200 font-medium">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Fulfillment Method</span>
            <span className="text-zinc-200 font-medium font-semibold capitalize">
              {order.orderType === "DINE_IN" ? "Deliver to Table" : "Pick Up at Concession"}
            </span>
          </div>
          {order.table && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Table Location</span>
              <span className="text-zinc-200 font-medium">{order.table.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-400">Grand Total Billing</span>
            <span className="text-indigo-400 font-extrabold">Rp {Number(order.grandTotal).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Items Ordered</h3>
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-4 flex flex-col gap-2.5">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-zinc-300">
                {item.productName} {item.note ? <span className="text-amber-500 text-xs">({item.note})</span> : null} <span className="text-zinc-500 font-medium">x{item.quantity}</span>
              </span>
              <span className="text-zinc-400">Rp {(Number(item.unitPrice) * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-3">
        <Button variant="ghost" onClick={() => refetch()} className="w-full py-2.5">
          Refresh Status
        </Button>
        <Button
          onClick={() => {
            router.push(`/self-order?table=${order.tableId || ""}`);
          }}
          className="w-full py-3 font-semibold"
        >
          Order More Food
        </Button>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
        <span className="text-zinc-400 text-sm font-medium">Loading status ticket...</span>
      </div>
    }>
      <WaitingContent />
    </Suspense>
  );
}
