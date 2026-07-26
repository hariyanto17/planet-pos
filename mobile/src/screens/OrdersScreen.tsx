import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useGetOrdersQuery } from "../lib/api/orderApi";
import { useGetCurrentShiftQuery } from "../lib/api/shiftApi";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { setFilters, resetFilters } from "../lib/store/features/order/slice";
import { selectOrderFilters } from "../lib/store/features/order/selectors";
import OrderHistoryCard from "../components/OrderHistoryCard";
import DatePickerModal from "../components/DatePickerModal";

type Props = StackScreenProps<RootStackParamList, "Orders">;

export default function OrdersScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectOrderFilters);

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch orders and active shift stats using RTK Query
  const {
    data,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useGetOrdersQuery(filters);

  const {
    data: shiftData,
    isLoading: isShiftLoading,
    refetch: refetchShift,
  } = useGetCurrentShiftQuery();

  // Search input debouncer (300-500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        dispatch(setFilters({ search: localSearch }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, dispatch, filters.search]);

  // Sync Redux search changes back to input state (e.g. on reset)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), refetchShift()]);
    setRefreshing(false);
  };

  const handleSelectDate = (dateStr: string) => {
    dispatch(setFilters({ businessDate: dateStr }));
  };

  const ordersList = useMemo(() => data?.orders || [], [data]);
  const meta = useMemo(
    () => data?.meta || { totalItems: 0, page: 1, limit: 10, totalPages: 1 },
    [data]
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      dispatch(setFilters({ page: newPage }));
    }
  };

  const isFilterActive = useMemo(() => {
    return (
      filters.status !== "" ||
      filters.paymentStatus !== "" ||
      filters.paymentMethod !== "" ||
      filters.search !== ""
    );
  }, [filters]);

  const renderEmptyState = () => {
    if (isFilterActive) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Pesanan tidak cocok</Text>
          <Text style={styles.emptyText}>Tidak ada pesanan yang cocok dengan filter terpilih.</Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => dispatch(resetFilters())}
          >
            <Text style={styles.resetBtnText}>Hapus Semua Filter</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Tidak ada transaksi hari ini</Text>
        <Text style={styles.emptyText}>Belum ada pesanan yang dibuat hari ini.</Text>
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "70%" }]} />
          <View style={[styles.skeletonLine, { width: "50%" }]} />
        </View>
      ))}
    </View>
  );

  // Statistics summaries from backend API
  const stats = shiftData?.statistics;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Riwayat Pesanan</Text>
        <View style={{ width: 68 }} />
      </View>

      {/* Main Content Area */}
      <FlatList
        data={ordersList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderHistoryCard
            order={item}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.id, mode: "HISTORY" })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818cf8" />
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Shift Metrics Dashboard Header */}
            {shiftData?.status === "OPEN" && stats ? (
              <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Ringkasan Shift Aktif</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statsCol}>
                    <Text style={styles.statsVal}>{stats.completedOrders}</Text>
                    <Text style={styles.statsLbl}>Pesanan Selesai</Text>
                  </View>
                  <View style={styles.statsCol}>
                    <Text style={styles.statsVal}>
                      Rp {Number(stats.completedRevenue).toLocaleString()}
                    </Text>
                    <Text style={styles.statsLbl}>Total Pendapatan</Text>
                  </View>
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsGrid}>
                  <View style={styles.statsCol}>
                    <Text style={styles.subStatsVal}>
                      Rp {Number(stats.cashRevenue).toLocaleString()}
                    </Text>
                    <Text style={styles.statsLbl}>Tunai</Text>
                  </View>
                  <View style={styles.statsCol}>
                    <Text style={styles.subStatsVal}>
                      Rp {Number(stats.qrisRevenue).toLocaleString()}
                    </Text>
                    <Text style={styles.statsLbl}>QRIS</Text>
                  </View>
                  <View style={styles.statsCol}>
                    <Text style={styles.subStatsVal}>
                      Rp {Number(stats.averageOrderValue).toLocaleString()}
                    </Text>
                    <Text style={styles.statsLbl}>AOV</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari no tiket, pelanggan, meja, SKU..."
                placeholderTextColor="#71717a"
                value={localSearch}
                onChangeText={setLocalSearch}
              />
              {localSearch ? (
                <TouchableOpacity onPress={() => setLocalSearch("")} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Date Filters Row */}
            <View style={styles.filterSection}>
              <Text style={styles.filterGroupLabel}>Rentang Tanggal</Text>
              <View style={styles.filterRow}>
                {["TODAY", "YESTERDAY"].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.filterPill,
                      filters.businessDate === d && styles.filterPillActive,
                    ]}
                    onPress={() => dispatch(setFilters({ businessDate: d }))}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        filters.businessDate === d && styles.filterPillTextActive,
                      ]}
                    >
                      {d === "TODAY" ? "Hari Ini" : "Kemarin"}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    filters.businessDate !== "TODAY" &&
                      filters.businessDate !== "YESTERDAY" &&
                      styles.filterPillActive,
                  ]}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      filters.businessDate !== "TODAY" &&
                        filters.businessDate !== "YESTERDAY" &&
                        styles.filterPillTextActive,
                    ]}
                  >
                    {filters.businessDate !== "TODAY" && filters.businessDate !== "YESTERDAY"
                      ? filters.businessDate
                      : "Pilih Tanggal"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Order Status Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterGroupLabel}>Status Pesanan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
                {[
                  { label: "Semua", value: "" },
                  { label: "Disiapkan", value: "PREPARING" },
                  { label: "Siap", value: "READY" },
                  { label: "Selesai", value: "COMPLETED" },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.filterPill, filters.status === s.value && styles.filterPillActive]}
                    onPress={() => dispatch(setFilters({ status: s.value }))}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        filters.status === s.value && styles.filterPillTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Payment Status Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterGroupLabel}>Status Pembayaran</Text>
              <View style={styles.filterRow}>
                {[
                  { label: "Semua", value: "" },
                  { label: "Tertunda", value: "PENDING" },
                  { label: "Dibayar", value: "PAID" },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.filterPill,
                      filters.paymentStatus === p.value && styles.filterPillActive,
                    ]}
                    onPress={() => dispatch(setFilters({ paymentStatus: p.value }))}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        filters.paymentStatus === p.value && styles.filterPillTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Payment Method Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterGroupLabel}>Metode Pembayaran</Text>
              <View style={styles.filterRow}>
                {[
                  { label: "Semua", value: "" },
                  { label: "Tunai", value: "CASH" },
                  { label: "QRIS", value: "QRIS" },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.filterPill,
                      filters.paymentMethod === m.value && styles.filterPillActive,
                    ]}
                    onPress={() => dispatch(setFilters({ paymentMethod: m.value }))}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        filters.paymentMethod === m.value && styles.filterPillTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          ordersList.length > 0 ? (
            <View style={styles.paginationFooter}>
              <TouchableOpacity
                style={[styles.pageBtn, meta.page === 1 && styles.pageBtnDisabled]}
                onPress={() => handlePageChange(meta.page - 1)}
                disabled={meta.page === 1}
              >
                <Text style={styles.pageBtnText}>Sebelumnya</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Halaman {meta.page} dari {meta.totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, meta.page === meta.totalPages && styles.pageBtnDisabled]}
                onPress={() => handlePageChange(meta.page + 1)}
                disabled={meta.page === meta.totalPages}
              >
                <Text style={styles.pageBtnText}>Berikutnya</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isOrdersLoading || isOrdersFetching ? renderSkeleton() : renderEmptyState()
        }
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSelect={handleSelectDate}
        initialDateStr={
          filters.businessDate !== "TODAY" && filters.businessDate !== "YESTERDAY"
            ? filters.businessDate
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#18181b",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  backText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "bold",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f4f4f5",
  },
  headerComponent: {
    marginBottom: 8,
  },
  statsCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsCol: {
    flex: 1,
  },
  statsVal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f4f4f5",
  },
  subStatsVal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#e4e4e7",
  },
  statsLbl: {
    fontSize: 10,
    color: "#71717a",
    marginTop: 2,
  },
  statsDivider: {
    height: 1,
    backgroundColor: "#27272a",
    marginVertical: 12,
  },
  searchContainer: {
    position: "relative",
    marginBottom: 16,
  },
  searchInput: {
    height: 44,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 40,
    color: "#f4f4f5",
    fontSize: 14,
  },
  clearSearchBtn: {
    position: "absolute",
    right: 12,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  clearSearchText: {
    color: "#a1a1aa",
    fontSize: 16,
    fontWeight: "bold",
  },
  filterSection: {
    marginBottom: 12,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a1a1aa",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterScrollRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  filterPillActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  filterPillText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 16,
  },
  paginationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  pageBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageBtnText: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "600",
  },
  pageInfo: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f4f4f5",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#71717a",
    textAlign: "center",
  },
  resetBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#27272a",
    borderRadius: 6,
  },
  resetBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  skeletonContainer: {
    gap: 12,
    marginTop: 16,
  },
  skeletonCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  skeletonHeader: {
    height: 16,
    backgroundColor: "#27272a",
    borderRadius: 4,
    width: "40%",
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#27272a",
    borderRadius: 3,
    width: "80%",
  },
});

