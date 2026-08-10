import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useGetCashierShiftReportQuery } from "../lib/api/reportsApi";
import { useAppSelector } from "../lib/store/hooks";
import { selectCurrentUser } from "../lib/store/features/auth/selectors";
import { useTheme, Theme } from "../theme";

type Props = StackScreenProps<RootStackParamList, "Orders">;

export default function OrdersScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentUser = useAppSelector(selectCurrentUser);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetCashierShiftReportQuery();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "--:--";
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const shift = data?.data?.shift;
  const transactions = data?.data?.transactions || [];

  if (!shift) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.noShiftTitle}>Shift Belum Dibuka</Text>
        <Text style={styles.noShiftText}>
          Anda harus membuka shift terlebih dahulu sebelum dapat melihat laporan atau melayani transaksi.
        </Text>
        <TouchableOpacity
          style={styles.openShiftBtn}
          onPress={() => navigation.navigate("OpenShift")}
        >
          <Text style={styles.openShiftBtnText}>Buka Shift Sekarang</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Laporan Shift</Text>
          <Text style={styles.subtitle}>{currentUser?.fullName || "Kasir"}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Shift Aktif</Text>
        </View>
      </View>

      {/* Stats Summary Dashboard */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeaderRow}>
          <View>
            <Text style={styles.statsLabel}>Total Penjualan</Text>
            <Text style={styles.statsValue}>Rp {Number(shift.totalSales).toLocaleString("id-ID")}</Text>
          </View>
          <View style={styles.alignRight}>
            <Text style={styles.statsLabel}>Transaksi</Text>
            <Text style={styles.statsValue}>{shift.totalTransactions}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.subLabel}>TUNAI</Text>
            <Text style={styles.subValue}>Rp {Number(shift.cashSales).toLocaleString("id-ID")}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.subLabel}>QRIS</Text>
            <Text style={styles.subValue}>Rp {Number(shift.qrisSales).toLocaleString("id-ID")}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.subLabel}>Modal Awal</Text>
            <Text style={styles.subValue}>Rp {Number(shift.openingCash).toLocaleString("id-ID")}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.subLabel}>Ekspektasi Kas laci</Text>
            <Text style={styles.subValue}>Rp {Number(shift.expectedCash).toLocaleString("id-ID")}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeShiftBtn}
          onPress={() =>
            navigation.navigate("CloseShift", {
              shiftId: shift.id,
              expectedCash: shift.expectedCash,
            })
          }
        >
          <Text style={styles.closeShiftBtnText}>Tutup Shift Drawer</Text>
        </TouchableOpacity>
      </View>

      {/* History Header */}
      <Text style={styles.sectionTitle}>Riwayat Transaksi Shift Anda</Text>

      {/* History List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.paymentId || item.orderNumber}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.txItem}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.orderId, mode: "HISTORY" })}
          >
            <View style={styles.txRow}>
              <View>
                <Text style={styles.txInvoice}>#{item.displayNumber}</Text>
                <Text style={styles.txMeta}>
                  {formatTime(item.createdAt)} • {item.paymentMethod}
                </Text>
              </View>

              <View style={styles.alignRight}>
                <Text style={styles.txTotal}>Rp {item.total.toLocaleString("id-ID")}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.paymentStatus === "PAID" ? styles.badgePaid : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.paymentStatus === "PAID" ? styles.badgeTextPaid : styles.badgeTextPending,
                    ]}
                  >
                    {item.paymentStatus === "PAID" ? "Paid" : "Pending"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Belum ada transaksi di shift ini.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingTop: 48,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    badge: {
      backgroundColor: "#eef2ff",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme.primary,
    },
    statsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      borderColor: theme.border,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 24,
    },
    statsHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    statsLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: "bold",
      textTransform: "uppercase",
    },
    statsValue: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.textPrimary,
      marginTop: 4,
    },
    alignRight: {
      alignItems: "flex-end",
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 12,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    col: {
      flex: 1,
    },
    subLabel: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    subValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.textPrimary,
      marginTop: 2,
    },
    closeShiftBtn: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 16,
    },
    closeShiftBtnText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "bold",
    },
    openShiftBtn: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 16,
    },
    openShiftBtnText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "bold",
    },
    noShiftTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.textPrimary,
      marginBottom: 8,
    },
    noShiftText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      marginHorizontal: 32,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.textPrimary,
      marginBottom: 12,
    },
    txItem: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderColor: theme.border,
      borderWidth: 1,
    },
    txRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    txInvoice: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.textPrimary,
    },
    txMeta: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    txTotal: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.textPrimary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginTop: 4,
    },
    badgePaid: {
      backgroundColor: "#eec", // subtle yellow-green or green
    },
    badgePending: {
      backgroundColor: "#fee2e2",
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "bold",
    },
    badgeTextPaid: {
      color: "#15803d",
    },
    badgeTextPending: {
      color: "#b91c1c",
    },
    listContent: {
      paddingBottom: 24,
    },
    emptyState: {
      paddingVertical: 32,
      alignItems: "center",
    },
    emptyStateText: {
      color: theme.textSecondary,
      fontSize: 14,
    },
  });
