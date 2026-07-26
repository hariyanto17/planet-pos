import { useState, useMemo } from "react";
import { ReportFilterState } from "../types";

export const useReports = () => {
  const [filters, setFilters] = useState<ReportFilterState>(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      preset: "MONTH",
      startDate: todayStr.slice(0, 8) + "01", // first of month
      endDate: todayStr,
      cashierId: "",
      shiftStatus: "",
      differenceStatus: "",
    };
  });

  const resolvedDates = useMemo(() => {
    const today = new Date();
    const format = (d: Date) => d.toISOString().split("T")[0];

    switch (filters.preset) {
      case "TODAY": {
        const t = format(today);
        return { startDate: t, endDate: t };
      }
      case "YESTERDAY": {
        const yest = new Date();
        yest.setDate(today.getDate() - 1);
        const y = format(yest);
        return { startDate: y, endDate: y };
      }
      case "WEEK": {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        return { startDate: format(weekAgo), endDate: format(today) };
      }
      case "MONTH": {
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: format(firstOfMonth), endDate: format(today) };
      }
      case "CUSTOM":
      default:
        return { startDate: filters.startDate, endDate: filters.endDate };
    }
  }, [filters.preset, filters.startDate, filters.endDate]);

  const updatePreset = (preset: ReportFilterState["preset"]) => {
    const today = new Date();
    const format = (d: Date) => d.toISOString().split("T")[0];

    setFilters((prev) => {
      let nextDates = { startDate: prev.startDate, endDate: prev.endDate };
      if (preset === "TODAY") {
        const t = format(today);
        nextDates = { startDate: t, endDate: t };
      } else if (preset === "YESTERDAY") {
        const yest = new Date();
        yest.setDate(today.getDate() - 1);
        const y = format(yest);
        nextDates = { startDate: y, endDate: y };
      } else if (preset === "WEEK") {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        nextDates = { startDate: format(weekAgo), endDate: format(today) };
      } else if (preset === "MONTH") {
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        nextDates = { startDate: format(firstOfMonth), endDate: format(today) };
      }
      return {
        ...prev,
        preset,
        ...nextDates,
      };
    });
  };

  const updateCustomRange = (start: string, end: string) => {
    setFilters((prev) => ({
      ...prev,
      preset: "CUSTOM",
      startDate: start,
      endDate: end,
    }));
  };

  const updateCashierId = (cashierId: string) => {
    setFilters((prev) => ({ ...prev, cashierId }));
  };

  const updateShiftStatus = (shiftStatus: string) => {
    setFilters((prev) => ({ ...prev, shiftStatus }));
  };

  const updateDiffStatus = (differenceStatus: string) => {
    setFilters((prev) => ({ ...prev, differenceStatus }));
  };

  return {
    filters,
    resolvedDates,
    updatePreset,
    updateCustomRange,
    updateCashierId,
    updateShiftStatus,
    updateDiffStatus,
  };
};
export default useReports;
