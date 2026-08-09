import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { logout } from "../lib/store/features/auth/slice";
import { selectCurrentUser } from "../lib/store/features/auth/selectors";
import { useGetOrdersQueueQuery, useGetPendingPaymentsQuery } from "../lib/api/orderApi";
import { useGetCurrentShiftQuery } from "../lib/api/shiftApi";
import { baseApi } from "../lib/api/baseApi";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";
import { WarningIcon } from "../components/CustomIcons";
import { useTheme, Theme } from "../theme";

type Props = StackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Fetch metrics using optimized dedicated endpoints
  const { data: pendingOrders = [], refetch: refetchPending } = useGetPendingPaymentsQuery();
  const { data: queueOrders = [], refetch: refetchQueue } = useGetOrdersQueueQuery();
  const { data: shiftData, refetch: refetchShift } = useGetCurrentShiftQuery();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchPending().unwrap().catch(() => {}),
      refetchQueue().unwrap().catch(() => {}),
      refetchShift().unwrap().catch(() => {}),
    ]);
    setIsRefreshing(false);
  }, [refetchPending, refetchQueue, refetchShift]);

  const isShiftOpen = shiftData?.status === "OPEN";

  const handleLogout = async () => {
    if (isShiftOpen) {
      showToast({
        type: "warning",
        title: "Shift Aktif",
        message: "Harap tutup shift kasir Anda sebelum keluar untuk mencegah shift terabaikan.",
      });
      return;
    }

    const confirmed = await showConfirmation({
      title: "Keluar",
      message: "Apakah Anda yakin ingin keluar dari sesi Anda?",
      confirmText: "Keluar",
      cancelText: "Batal",
      variant: "danger",
    });

    if (confirmed) {
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
    }
  };

  const pendingPaymentsCount = pendingOrders.length;
  const preparingOrdersCount = queueOrders.filter((o: any) => o.status === "PREPARING").length;

  const today = new Date().toLocaleDateString("id-ID", {
    dateStyle: "full",
  });

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Planet Cinema Concessions</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentUser?.fullName?.charAt(0) || "K"}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{currentUser?.fullName || "Operator Kasir"}</Text>
          <Text style={styles.userRole}>{currentUser?.role || "KASIR"}</Text>
        </View>
      </View>

      {/* Shift Guard Banner */}
      {!isShiftOpen ? (
        <View style={styles.alertCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <WarningIcon color={theme.error} />
            <Text style={styles.alertTitle}>Tidak Ada Shift Aktif</Text>
          </View>
          <Text style={styles.alertText}>
            Buka shift kasir sebelum membuat pesanan baru.
          </Text>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => navigation.navigate("OpenShift")}
          >
            <Text style={styles.alertButtonText}>Buka Shift Kasir</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingPaymentsCount}</Text>
          <Text style={styles.statLabel}>Pembayaran Tertunda</Text>
        </View>
        <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
          <Text style={styles.statNumber}>{preparingOrdersCount}</Text>
          <Text style={styles.statLabel}>Pesanan Disiapkan</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={[styles.menuButton, !isShiftOpen && styles.menuButtonDisabled]}
          onPress={() => {
            if (!isShiftOpen) {
              showToast({
                type: "warning",
                title: "Shift Diperlukan",
                message: "Harap buka shift kasir terlebih dahulu.",
              });
              return;
            }
            navigation.navigate("NewOrder");
          }}
          disabled={!isShiftOpen}
        >
          <Text style={[styles.menuButtonText, !isShiftOpen && styles.menuTextDisabled]}>Pesanan Baru</Text>
          <Text style={styles.menuButtonDesc}>Buat transaksi penjualan kasir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate("Orders")}>
          <Text style={styles.menuButtonText}>Antrean Pesanan</Text>
          <Text style={styles.menuButtonDesc}>Kelola pesanan tertunda dan persiapan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.menuButtonText}>Profil Operator</Text>
          <Text style={styles.menuButtonDesc}>Lihat kredensial kasir</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Keluar Sesi</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.background,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  date: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 6,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  userRole: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },
  menu: {
    gap: 16,
    marginBottom: 40,
  },
  menuButton: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 18,
  },
  menuButtonText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
  menuButtonDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.error,
    borderRadius: 8,
  },
  logoutText: {
    color: theme.error,
    fontSize: 15,
    fontWeight: "600",
  },
  alertCard: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.error,
  },
  alertText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  alertButton: {
    backgroundColor: theme.error,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  alertButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  menuButtonDisabled: {
    opacity: 0.5,
    backgroundColor: theme.surfaceSecondary,
  },
  menuTextDisabled: {
    color: theme.textMuted,
  },
});
