import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { ShiftStatusBadge } from "./ShiftStatusBadge";
import { ShiftDifferenceBadge } from "./ShiftDifferenceBadge";

interface ReportsShiftTableProps {
  data?: any;
  isLoading: boolean;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (field: string) => void;
  onRetry: () => void;
  isError: boolean;
}

export const ReportsShiftTable: React.FC<ReportsShiftTableProps> = ({
  data,
  isLoading,
  page,
  limit,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  onRetry,
  isError,
}) => {
  const shifts = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const headers = [
    { key: "businessDate", label: "Business Date" },
    { key: "cashier", label: "Cashier" },
    { key: "status", label: "Shift Status" },
    { key: "openedAt", label: "Opened" },
    { key: "closedAt", label: "Closed" },
    { key: "cashSales", label: "Cash Sales" },
    { key: "qrisSales", label: "QRIS Sales" },
    { key: "expectedCash", label: "Expected Cash" },
    { key: "actualCash", label: "Actual Cash" },
    { key: "difference", label: "Difference" },
    { key: "notes", label: "Notes" },
  ];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-surface border border-border rounded-2xl gap-4">
        <span className="text-text-secondary">⚠️ Failed to load cashier shifts report.</span>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-bold bg-indigo-600 rounded-xl hover:bg-indigo-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-surface border border-border/80 p-5 rounded-2xl shadow-md">
      <span className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">
        Cashier Shift Logs & Reconciliation History
      </span>

      <DataTable
        headers={headers.map((h) => (
          <button
            key={h.key}
            onClick={() => onSortChange(h.key)}
            className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-text-muted hover:text-text-primary outline-none"
          >
            {h.label}
            {renderSortIndicator(h.key)}
          </button>
        ))}
        isLoading={isLoading}
      >
        {shifts.map((s: any) => (
          <tr key={s.id} className="border-b border-border/50 hover:bg-surface-secondary/20 transition">
            <td className="px-6 py-4 text-xs font-bold text-text-primary font-mono">
              {s.businessDate}
            </td>
            <td className="px-6 py-4 text-xs font-semibold text-text-primary">
              {s.cashier}
            </td>
            <td className="px-6 py-4">
              <ShiftStatusBadge status={s.status} />
            </td>
            <td className="px-6 py-4 text-[10px] text-text-muted font-medium">
              {new Date(s.openedAt).toLocaleTimeString()}
            </td>
            <td className="px-6 py-4 text-[10px] text-text-muted font-medium">
              {s.closedAt ? new Date(s.closedAt).toLocaleTimeString() : "-"}
            </td>
            <td className="px-6 py-4 text-xs text-text-primary font-mono">
              {formatCurrency(s.cashSales)}
            </td>
            <td className="px-6 py-4 text-xs text-text-primary font-mono">
              {formatCurrency(s.qrisSales)}
            </td>
            <td className="px-6 py-4 text-xs font-bold text-indigo-400 font-mono">
              {formatCurrency(s.expectedCash)}
            </td>
            <td className="px-6 py-4 text-xs text-text-primary font-mono">
              {s.actualCash !== null ? formatCurrency(s.actualCash) : "-"}
            </td>
            <td className="px-6 py-4">
              <ShiftDifferenceBadge difference={s.difference} status={s.status} />
            </td>
            <td className="px-6 py-4 text-xs text-text-muted max-w-[150px] truncate" title={s.notes || ""}>
              {s.notes || "-"}
            </td>
          </tr>
        ))}
      </DataTable>

      {shifts.length === 0 && !isLoading && (
        <div className="p-8 border border-border/60 bg-surface-secondary/20 text-center rounded-xl text-text-muted text-sm">
          No cashier shifts found matching active filter criteria.
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-2">
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};
export default ReportsShiftTable;
