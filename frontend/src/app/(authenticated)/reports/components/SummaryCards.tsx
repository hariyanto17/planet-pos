import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface SummaryCardsProps {
  data?: any;
  isLoading: boolean;
  showShifts?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data, isLoading, showShifts = false }) => {
  if (showShifts) {
    const shifts = data?.shifts || {
      total: 0,
      open: 0,
      closed: 0,
      difference: 0,
      balanced: 0,
      unbalanced: 0,
    };

    const diff = Number(shifts.difference || 0);
    const diffColor = diff === 0 ? "text-emerald-400" : diff > 0 ? "text-amber-400 font-bold" : "text-rose-400 font-bold";

    const shiftCards = [
      {
        title: "Total Shifts",
        value: `${shifts.total} Shifts`,
        desc: "All recorded shifts in date range",
        color: "text-text-primary",
      },
      {
        title: "Active Open Shifts",
        value: `${shifts.open} Open`,
        desc: "Unclosed registers operating",
        color: "text-indigo-400",
      },
      {
        title: "Reconciliation Difference",
        value: formatCurrency(diff),
        desc: "Aggregate drawer cash discrepancy",
        color: diffColor,
      },
      {
        title: "Balanced vs Unbalanced",
        value: `${shifts.balanced} / ${shifts.unbalanced}`,
        desc: "Shifts with zero vs. non-zero offset",
        color: "text-text-primary",
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shiftCards.map((card, idx) => (
          <div
            key={idx}
            className="p-5 bg-surface border border-border rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow-sm"
          >
            <span className="text-text-muted text-xs font-bold uppercase tracking-wider">
              {card.title}
            </span>
            {isLoading ? (
              <div className="h-9 w-2/3 bg-surface-secondary animate-pulse rounded-lg mt-1" />
            ) : (
              <span className={`text-2xl font-black ${card.color} tracking-tight`}>
                {card.value}
              </span>
            )}
            <p className="text-text-muted text-xs mt-1 font-medium">{card.desc}</p>
          </div>
        ))}
      </div>
    );
  }

  const stats = data || {
    grossRevenue: 0,
    discountTotal: 0,
    netRevenue: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    completedOrders: 0,
  };

  const cardList = [
    {
      title: "Gross Revenue",
      value: formatCurrency(stats.grossRevenue),
      desc: "Total sales price before promo deductions",
      color: "text-text-primary",
    },
    {
      title: "Total Discounts",
      value: formatCurrency(stats.discountTotal),
      desc: "Promotional campaign price subtractions",
      color: "text-red-400",
    },
    {
      title: "Net Revenue",
      value: formatCurrency(stats.netRevenue),
      desc: "Reconciled paid transactions collected",
      color: "text-emerald-400",
    },
    {
      title: "Average Order Value (AOV)",
      value: formatCurrency(stats.averageOrderValue),
      desc: "Net completed revenue / paid order counts",
      color: "text-indigo-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardList.map((card, idx) => (
        <div
          key={idx}
          className="p-5 bg-surface border border-border rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow-sm"
        >
          <span className="text-text-muted text-xs font-bold uppercase tracking-wider">
            {card.title}
          </span>
          {isLoading ? (
            <div className="h-9 w-2/3 bg-surface-secondary animate-pulse rounded-lg mt-1" />
          ) : (
            <span className={`text-2xl font-black ${card.color} tracking-tight`}>
              {card.value}
            </span>
          )}
          <p className="text-text-muted text-xs mt-1 font-medium">{card.desc}</p>
        </div>

      ))}
    </div>
  );
};
export default SummaryCards;
