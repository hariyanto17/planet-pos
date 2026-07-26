import React from "react";
import { ReportFilterState } from "../types";

interface ReportFiltersProps {
  filters: ReportFilterState;
  onPresetChange: (preset: ReportFilterState["preset"]) => void;
  onCustomRangeChange: (start: string, end: string) => void;
  showShiftsFilters?: boolean;
  cashiers?: { id: string; fullName: string }[];
  onCashierChange?: (id: string) => void;
  onShiftStatusChange?: (status: string) => void;
  onDiffStatusChange?: (status: string) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onPresetChange,
  onCustomRangeChange,
  showShiftsFilters = false,
  cashiers = [],
  onCashierChange,
  onShiftStatusChange,
  onDiffStatusChange,
}) => {
  const presets: { value: ReportFilterState["preset"]; label: string }[] = [
    { value: "TODAY", label: "Today" },
    { value: "YESTERDAY", label: "Yesterday" },
    { value: "WEEK", label: "7 Days" },
    { value: "MONTH", label: "This Month" },
    { value: "CUSTOM", label: "Custom Range" },
  ];

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col gap-4 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onPresetChange(preset.value)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-150 border ${
                filters.preset === preset.value
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date boundary values text identifier */}
        <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest bg-zinc-950/60 px-3.5 py-2 border border-zinc-800/50 rounded-xl">
          Active: <span className="text-zinc-300 font-extrabold">{filters.startDate}</span> to{" "}
          <span className="text-zinc-300 font-extrabold">{filters.endDate}</span>
        </div>
      </div>

      {filters.preset === "CUSTOM" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800/50 pt-4 animate-fade-in">
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onCustomRangeChange(e.target.value, filters.endDate)}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onCustomRangeChange(filters.startDate, e.target.value)}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-indigo-500 text-sm"
            />
          </div>
        </div>
      )}

      {showShiftsFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-800/50 pt-4 animate-fade-in">
          {/* Cashier Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Cashier Filter</label>
            <select
              value={filters.cashierId || ""}
              onChange={(e) => onCashierChange?.(e.target.value)}
              className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-xs font-bold uppercase"
            >
              <option value="">All Cashiers</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Status Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Shift Status</label>
            <select
              value={filters.shiftStatus || ""}
              onChange={(e) => onShiftStatusChange?.(e.target.value)}
              className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-xs font-bold uppercase"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Difference Status Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Difference Status</label>
            <select
              value={filters.differenceStatus || ""}
              onChange={(e) => onDiffStatusChange?.(e.target.value)}
              className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-indigo-500 text-xs font-bold uppercase"
            >
              <option value="">All Reconciliation Differences</option>
              <option value="BALANCED">Balanced Shifts Only</option>
              <option value="DISCREPANCY">Discrepancy Shifts Only</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReportFilters;
