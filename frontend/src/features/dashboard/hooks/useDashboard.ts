import { useGetDashboardStatsQuery } from "@/lib/api/dashboardApi";
import { DashboardStats } from "../types";

export const useDashboard = () => {
  const { data, isLoading, isError, refetch } = useGetDashboardStatsQuery();

  // Handle standard response envelope
  const stats: DashboardStats = data || {
    todayRevenue: 0,
    todayOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    completedOrders: 0,
    cashRevenue: 0,
    qrisRevenue: 0,
    recentOrders: [],
  };

  return {
    stats,
    isLoading,
    isError,
    refetch,
  };
};
export default useDashboard;
