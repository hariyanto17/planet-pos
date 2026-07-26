import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
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

type Props = StackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();

  // Fetch metrics using optimized dedicated endpoints
  const { data: pendingOrders = [] } = useGetPendingPaymentsQuery();
  const { data: queueOrders = [] } = useGetOrdersQueueQuery();
  const { data: shiftData, refetch: refetchShift } = useGetCurrentShiftQuery();

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
    <ScrollView contentContainerStyle={styles.container}>
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
          <Text style={styles.alertTitle}>⚠️ Tidak Ada Shift Aktif</Text>
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
        <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: "#27272a" }]}>
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#09090b",
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
    color: "#f4f4f5",
  },
  date: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 6,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4f46e5",
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
    color: "#f4f4f5",
  },
  userRole: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 2,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
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
    color: "#f4f4f5",
  },
  statLabel: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 4,
  },
  menu: {
    gap: 16,
    marginBottom: 40,
  },
  menuButton: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 18,
  },
  menuButtonText: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "bold",
  },
  menuButtonDesc: {
    color: "#71717a",
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#e11d48",
    borderRadius: 8,
  },
  logoutText: {
    color: "#e11d48",
    fontSize: 15,
    fontWeight: "600",
  },
  alertCard: {
    backgroundColor: "#7f1d1d",
    borderWidth: 1,
    borderColor: "#b91c1c",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fecaca",
  },
  alertText: {
    fontSize: 12,
    color: "#fca5a5",
  },
  alertButton: {
    backgroundColor: "#ef4444",
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
    backgroundColor: "#09090b",
  },
  menuTextDisabled: {
    color: "#71717a",
  },
});
