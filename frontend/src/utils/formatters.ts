// Reusable Formatting Helpers for Next.js Web Client

/**
 * Formats a numeric value into Indonesian Rupiah currency format.
 * e.g. 18000 -> "Rp 18,000"
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return "Rp 0";
  const num = Number(val);
  return `Rp ${num.toLocaleString("id-ID")}`;
};

export const formatPrice = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return "0";
  const num = Number(val);
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(num);
};

export const parseFormattedNumber = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/\./g, "").replace(/,/g, "");
  return Number(clean) || 0;
};


/**
 * Strips technical transaction suffixes and prefixes order tags.
 * e.g. "A015-0725" -> "Order #A015"
 */
export const formatOrderNumber = (displayNumber: string | undefined | null): string => {
  if (!displayNumber) return "Order #---";
  const code = displayNumber.split("-")[0];
  return `Order #${code}`;
};

/**
 * Formats order creation timestamp into relative or calendar summaries.
 * e.g. "5 min ago", "Today • 14:25", "Yesterday"
 */
export const formatRelativeTime = (createdAt: string | undefined | null): string => {
  if (!createdAt) return "---";
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `Today • ${hours}:${mins}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isYesterday) {
    return `Yesterday • ${hours}:${mins}`;
  }

  return `${date.toLocaleDateString()} • ${hours}:${mins}`;
};
