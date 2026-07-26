import { useState, useMemo } from "react";
import { useGetOrdersQuery } from "@/lib/api/orderApi";
import { OrderFilterState } from "../types";

export const useOrders = () => {
  const [filters, setFilters] = useState<OrderFilterState>({
    page: 1,
    limit: 20,
    search: "",
    status: "",
    paymentStatus: "",
    paymentMethod: "",
    source: "",
    businessDate: "ALL",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Calculate start/end dates for API query based on UI selection
  const queryParams = useMemo(() => {
    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;

    if (filters.businessDate === "TODAY") {
      const d = new Date();
      startDate = d.toISOString().split("T")[0];
      endDate = startDate;
    } else if (filters.businessDate === "YESTERDAY") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      startDate = d.toISOString().split("T")[0];
      endDate = startDate;
    } else if (filters.businessDate === "CUSTOM") {
      startDate = filters.customDateStart || undefined;
      endDate = filters.customDateEnd || undefined;
    }

    return {
      page: filters.page,
      limit: filters.limit,
      search: filters.search.trim() || undefined,
      status: filters.status || undefined,
      paymentStatus: filters.paymentStatus || undefined,
      paymentMethod: filters.paymentMethod || undefined,
      source: filters.source || undefined,
      startDate,
      endDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };
  }, [filters]);

  // Execute query using keepPreviousData from RTK query
  const { data, isLoading, isError, refetch } = useGetOrdersQuery(queryParams, {
    refetchOnMountOrArgChange: true,
  });

  const orders = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  };

  const updateFilter = <K extends keyof OrderFilterState>(key: K, value: OrderFilterState[K]) => {
    setFilters((prev) => {
      // Whenever filters (other than page) are adjusted, automatically reset page back to 1
      const nextFilters = { ...prev, [key]: value };
      if (key !== "page") {
        nextFilters.page = 1;
      }
      return nextFilters;
    });
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: "",
      status: "",
      paymentStatus: "",
      paymentMethod: "",
      source: "",
      businessDate: "ALL",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  return {
    orders,
    pagination,
    isLoading,
    isError,
    filters,
    updateFilter,
    resetFilters,
    refetch,
  };
};
export default useOrders;
