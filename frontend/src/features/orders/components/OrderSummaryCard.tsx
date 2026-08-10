import React from "react";
import { formatCurrency, formatOrderNumber, formatRelativeTime } from "@/utils/formatters";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface OrderSummaryCardProps {
  order: any;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ order }) => {
  return (
    <div className="p-6 bg-surface border border-border/80 rounded-2xl flex flex-col gap-5 shadow-md">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-text-primary text-sm font-bold uppercase tracking-wider">
          Order Information
        </h3>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold">Order Number</span>
          <span className="text-text-primary font-bold">{formatOrderNumber(order.displayNumber)}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold">Fulfillment Date</span>
          <span className="text-text-primary font-medium">
            {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold">Created At</span>
          <span className="text-text-primary font-medium">{formatRelativeTime(order.createdAt)}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold">Customer</span>
          <span className="text-text-primary font-bold">{order.customerName}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold">Seat Location</span>
          <span className="text-text-primary font-medium">{order.table?.name || "Walk-in"}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold">Order Source</span>
          <span className="text-text-primary font-medium">
            {order.source === "SELF_ORDER" ? "SELF ORDER" : "CASHIER"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold">Fulfillment Type</span>
          <span className="text-text-primary font-medium">
            {order.orderType === "DINE_IN" ? "Dine In" : "Takeaway"}
          </span>
        </div>
      </div>

      {order.notes ? (
        <div className="p-3 bg-surface-secondary border border-border rounded-xl flex flex-col gap-1">
          <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">
            Customer Instructions
          </span>
          <span className="text-text-primary text-xs italic">&ldquo;{order.notes}&rdquo;</span>
        </div>
      ) : null}

      <div className="border-t border-border pt-4 flex flex-col gap-2">
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {Number(order.discountAmount) > 0 && (
          <div className="flex justify-between text-xs text-rose-500">
            <span>Promotion Discounts</span>
            <span>- {formatCurrency(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Tax</span>
          <span>{formatCurrency(order.taxAmount)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-text-primary border-t border-border pt-2 mt-1">
          <span>Grand Total</span>
          <span className="text-indigo-400 text-base">{formatCurrency(order.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
};
export default OrderSummaryCard;
