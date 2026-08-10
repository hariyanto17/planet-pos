import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  useWindowDimensions,
  TouchableWithoutFeedback,
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
import { ArrowLeftIcon, CloseIcon, FilterIcon, SearchIcon } from "../components/CustomIcons";
import { useTheme, Theme } from "../theme";

type Props = StackScreenProps<RootStackParamList, "Orders">;

export default function OrdersScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const filters = useAppSelector(selectOrderFilters);

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter Modal States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState(filters.businessDate);
  const [tempStatus, setTempStatus] = useState(filters.status);
  const [tempPaymentStatus, setTempPaymentStatus] = useState(filters.paymentStatus);
  const [tempPaymentMethod, setTempPaymentMethod] = useState(filters.paymentMethod);

  // Sync temporary state when modal opens
  const openFilterModal = () => {
    setTempDate(filters.businessDate);
    setTempStatus(filters.status);
    setTempPaymentStatus(filters.paymentStatus);
    setTempPaymentMethod(filters.paymentMethod);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    dispatch(
      setFilters({
        businessDate: tempDate,
        status: tempStatus,
        paymentStatus: tempPaymentStatus,
        paymentMethod: tempPaymentMethod,
        page: 1,
      })
    );
    setFilterModalVisible(false);
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
    setTempDate("TODAY");
    setTempStatus("");
    setTempPaymentStatus("");
    setTempPaymentMethod("");
    setLocalSearch("");
    setFilterModalVisible(false);
  };

  // Fetch orders and active shift stats using RTK Query
  const {
    data,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    refetch: refetchOrders,
  } = useGetOrdersQuery(filters);

  const {
    data: shiftData,
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
    setTempDate(dateStr);
    setDatePickerVisible(false);
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
      filters.businessDate !== "TODAY" ||
      filters.search !== ""
    );
  }, [filters]);

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {isFilterActive ? "Pesanan tidak cocok" : "Belum ada pesanan"}
        </Text>
        {isFilterActive && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetFilters}
          >
            <Text style={styles.resetBtnText}>Hapus Filter</Text>
          </TouchableOpacity>
        )}
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
        <View>
          <Text style={styles.title}>Pesanan</Text>
          <Text style={styles.subtitle}>Riwayat transaksi</Text>
        </View>
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Shift Metrics Dashboard Header */}
            {shiftData?.status === "OPEN" && stats ? (
              <View style={styles.compactStatsCard}>
                <View style={styles.statsHeaderRow}>
                  <Text style={styles.statsTitle}>SHIFT AKTIF</Text>
                  <Text style={styles.statsSummaryText}>
                    {stats.completedOrders} Pesanan • Rp {Number(stats.completedRevenue).toLocaleString()}
                  </Text>
                  <View style={styles.statsDetailsRow}>
                    <Text style={styles.statsSubText}>Tunai: Rp {Number(stats.cashRevenue).toLocaleString()}</Text>
                    <Text style={styles.statsSubText}>QRIS: Rp {Number(stats.qrisRevenue).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Search and Filter Row */}
            <View style={styles.controlsRow}>
              <View style={styles.searchContainer}>
                <SearchIcon color={theme.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari pesanan..."
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

              <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
                <FilterIcon color={theme.textPrimary} />
                <Text style={styles.filterBtnText}>Filter</Text>
              </TouchableOpacity>
            </View>

            {/* Active Filter Chips */}
            {isFilterActive && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {filters.businessDate !== "TODAY" && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {filters.businessDate === "YESTERDAY" ? "Kemarin" : filters.businessDate}
                    </Text>
                    <TouchableOpacity onPress={() => dispatch(setFilters({ businessDate: "TODAY" }))}>
                      <Text style={styles.chipCloseText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {filters.status !== "" && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {filters.status === "PREPARING" ? "Disiapkan" : filters.status === "READY" ? "Siap" : "Selesai"}
                    </Text>
                    <TouchableOpacity onPress={() => dispatch(setFilters({ status: "" }))}>
                      <Text style={styles.chipCloseText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {filters.paymentStatus !== "" && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {filters.paymentStatus === "PENDING" ? "Tertunda" : "Dibayar"}
                    </Text>
                    <TouchableOpacity onPress={() => dispatch(setFilters({ paymentStatus: "" }))}>
                      <Text style={styles.chipCloseText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {filters.paymentMethod !== "" && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {filters.paymentMethod === "CASH" ? "Tunai" : "QRIS"}
                    </Text>
                    <TouchableOpacity onPress={() => dispatch(setFilters({ paymentMethod: "" }))}>
                      <Text style={styles.chipCloseText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity onPress={handleResetFilters} style={styles.clearAllChipsBtn}>
                  <Text style={styles.clearAllChipsText}>Hapus Semua</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
          tempDate !== "TODAY" && tempDate !== "YESTERDAY"
            ? tempDate
            : undefined
        }
      />

      {/* Bottom Sheet Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={[styles.modalOverlay, screenWidth > 600 && styles.modalOverlayTablet]}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, screenWidth > 600 && styles.modalContentTablet]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filter Pesanan</Text>
                  <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                    <CloseIcon color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                  {/* Date Group */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterGroupLabel}>Rentang Tanggal</Text>
                    <View style={styles.filterRow}>
                      {["TODAY", "YESTERDAY"].map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.filterPill,
                            tempDate === d && styles.filterPillActive,
                          ]}
                          onPress={() => setTempDate(d)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              tempDate === d && styles.filterPillTextActive,
                            ]}
                          >
                            {d === "TODAY" ? "Hari Ini" : "Kemarin"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[
                          styles.filterPill,
                          tempDate !== "TODAY" &&
                          tempDate !== "YESTERDAY" &&
                          styles.filterPillActive,
                        ]}
                        onPress={() => setDatePickerVisible(true)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            tempDate !== "TODAY" &&
                            tempDate !== "YESTERDAY" &&
                            styles.filterPillTextActive,
                          ]}
                        >
                          {tempDate !== "TODAY" && tempDate !== "YESTERDAY"
                            ? tempDate
                            : "Pilih Tanggal"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Status Pesanan */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterGroupLabel}>Status Pesanan</Text>
                    <View style={styles.filterRow}>
                      {[
                        { label: "Semua", value: "" },
                        { label: "Disiapkan", value: "PREPARING" },
                        { label: "Siap", value: "READY" },
                        { label: "Selesai", value: "COMPLETED" },
                      ].map((s) => (
                        <TouchableOpacity
                          key={s.value}
                          style={[styles.filterPill, tempStatus === s.value && styles.filterPillActive]}
                          onPress={() => setTempStatus(s.value)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              tempStatus === s.value && styles.filterPillTextActive,
                            ]}
                          >
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Status Pembayaran */}
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
                            tempPaymentStatus === p.value && styles.filterPillActive,
                          ]}
                          onPress={() => setTempPaymentStatus(p.value)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              tempPaymentStatus === p.value && styles.filterPillTextActive,
                            ]}
                          >
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Metode Pembayaran */}
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
                            tempPaymentMethod === m.value && styles.filterPillActive,
                          ]}
                          onPress={() => setTempPaymentMethod(m.value)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              tempPaymentMethod === m.value && styles.filterPillTextActive,
                            ]}
                          >
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalResetBtn} onPress={handleResetFilters}>
                    <Text style={styles.modalResetBtnText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalApplyBtn} onPress={applyFilters}>
                    <Text style={styles.modalApplyBtnText}>Terapkan Filter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  headerComponent: {
    marginBottom: 8,
  },
  compactStatsCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignSelf: "center",
    width: "100%",
  },
  statsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.primary,
    letterSpacing: 0.5,
  },
  statsSummaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  statsDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 6,
  },
  statsDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsSubText: {
    fontSize: 11,
    color: theme.textSecondary,
    marginHorizontal: 8,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: theme.textPrimary,
    fontSize: 13,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: "bold",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    gap: 4,
  },
  filterBtnText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  chipsScroll: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 4,
  },
  chipText: {
    color: theme.textPrimary,
    fontSize: 11,
    fontWeight: "500",
  },
  chipCloseText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 14,
  },
  clearAllChipsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllChipsText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  filterSection: {
    marginBottom: 16,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterPillActive: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  filterPillText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: "500",
  },
  filterPillTextActive: {
    color: theme.primary,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  paginationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 32,
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageBtnText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  pageInfo: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
  resetBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.primary,
    borderRadius: 6,
  },
  resetBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  skeletonContainer: {
    gap: 8,
    marginTop: 8,
  },
  skeletonCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  skeletonHeader: {
    height: 14,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 3,
    width: "35%",
  },
  skeletonLine: {
    height: 10,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 2,
    width: "75%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayTablet: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  modalContentTablet: {
    width: 500,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  modalScrollBody: {
    paddingBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  modalResetBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalResetBtnText: {
    color: theme.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  modalApplyBtn: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalApplyBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
});

