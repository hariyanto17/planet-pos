// Shared status colors, labels and layouts configuration
export const ORDER_STATUS_CONFIG = {
  NEW: {
    label: "Baru",
    color: "#6366f1", // Indigo
    backgroundColor: "#312e81",
  },
  PREPARING: {
    label: "Disiapkan",
    color: "#3b82f6", // Blue
    backgroundColor: "#1e3a8a",
  },
  READY: {
    label: "Siap",
    color: "#10b981", // Green
    backgroundColor: "#064e3b",
  },
  COMPLETED: {
    label: "Selesai",
    color: "#71717a", // Zinc Gray
    backgroundColor: "#27272a",
  },
  CANCELLED: {
    label: "Dibatalkan",
    color: "#ef4444", // Red
    backgroundColor: "#7f1d1d",
  },
};
export type OrderStatusKey = keyof typeof ORDER_STATUS_CONFIG;

export const PAYMENT_STATUS_CONFIG = {
  PENDING: {
    label: "Tertunda",
    color: "#eab308", // Yellow
    backgroundColor: "#713f12",
  },
  PAID: {
    label: "Dibayar",
    color: "#10b981", // Green
    backgroundColor: "#064e3b",
  },
  CANCELLED: {
    label: "Dibatalkan",
    color: "#ef4444", // Red
    backgroundColor: "#7f1d1d",
  },
};
export type PaymentStatusKey = keyof typeof PAYMENT_STATUS_CONFIG;
