"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useGetOrderQuery } from "@/lib/api/orderApi";
import { OrderSummaryCard } from "@/features/orders/components/OrderSummaryCard";
import { PaymentSummaryCard } from "@/features/orders/components/PaymentSummaryCard";
import { OrderItemTable } from "@/features/orders/components/OrderItemTable";
import { TimelineCard } from "@/features/orders/components/TimelineCard";
import { Button } from "@/components/Button";
import { formatOrderNumber } from "@/utils/formatters";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TEXT } from "@/lib/i18n/id";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const currentUser = useAppSelector(selectCurrentUser);

  // Authorization Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const { data, isLoading, isError, refetch } = useGetOrderQuery(id, {
    refetchOnMountOrArgChange: true,
  });

  const order = data;

  if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "ACCOUNTING") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-2xl text-center shadow-lg max-w-md mx-auto mt-12 gap-4">
        <span className="text-xl">⚠️</span>
        <div className="flex flex-col gap-1">
          <h2 className="text-text-primary font-bold">Gagal memuat detail pesanan</h2>
          <p className="text-text-muted text-xs">Verifikasi pengidentifikasi atau periksa log server.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/orders")}>
            {TEXT.orders.backToOrders}
          </Button>
          <Button variant="primary" onClick={refetch}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header details bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/orders")}
              className="text-text-muted hover:text-text-primary transition text-sm font-medium"
            >
              ← {TEXT.orders.backToOrders}
            </button>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary mt-2">
            Detail • {formatOrderNumber(order.displayNumber)}
          </h1>
        </div>
        <Button variant="secondary" onClick={refetch}>
          Perbarui Detail
        </Button>
      </div>

      {/* Main Grid Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Summary and Payments */}
        <div className="flex flex-col gap-6">
          <OrderSummaryCard order={order} />
          <PaymentSummaryCard payments={order.payments} />
        </div>

        {/* Right Side: Items table and logs */}
        <div className="flex flex-col gap-6">
          <OrderItemTable items={order.items} />
          <TimelineCard timelines={order.timelines} />
        </div>
      </div>
    </div>
  );
}
