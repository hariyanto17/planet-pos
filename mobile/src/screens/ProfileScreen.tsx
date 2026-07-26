import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppSelector, useAppDispatch } from "../lib/store/hooks";
import { selectCurrentUser } from "../lib/store/features/auth/selectors";
import { logout } from "../lib/store/features/auth/slice";
import { useGetCurrentShiftQuery } from "../lib/api/shiftApi";
import { baseApi } from "../lib/api/baseApi";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";

type Props = StackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const { data: shiftData } = useGetCurrentShiftQuery();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();

  const isShiftOpen = shiftData?.status === "OPEN";
  const stats = shiftData?.statistics;

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

  const formatOpenedTime = (openedAtStr: string) => {
    if (!openedAtStr) return "-";
    const date = new Date(openedAtStr);
    const hrs = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profil Operator</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentUser ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kredensial Operator</Text>
            <View style={styles.row}>
              <Text style={styles.infoLabel}>Nama Lengkap</Text>
              <Text style={styles.infoValue}>{currentUser.fullName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.infoLabel}>Nama Pengguna</Text>
              <Text style={styles.infoValue}>{currentUser.username}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.infoLabel}>Peran Operator</Text>
              <Text style={styles.infoValue}>{currentUser.role}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noUserText}>Tidak ada sesi kasir aktif</Text>
        )}

        {/* Active Cashier Shift Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shift Kasir Aktif</Text>
          {isShiftOpen ? (
            <View style={styles.shiftDetails}>
              <View style={styles.row}>
                <Text style={styles.infoLabel}>Status Shift</Text>
                <Text style={[styles.infoValue, { color: "#10b981", fontWeight: "bold" }]}>AKTIF (BUKA)</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.infoLabel}>Dibuka Pada</Text>
                <Text style={styles.infoValue}>{formatOpenedTime(shiftData.openedAt)}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.infoLabel}>Modal Kas Awal</Text>
                <Text style={styles.infoValue}>Rp {Number(shiftData.openingCash).toLocaleString()}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.infoLabel}>Penjualan Tunai Selesai</Text>
                <Text style={styles.infoValue}>Rp {Number(stats?.cashRevenue || 0).toLocaleString()}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.infoLabel}>Penjualan QRIS Selesai</Text>
                <Text style={styles.infoValue}>Rp {Number(stats?.qrisRevenue || 0).toLocaleString()}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.infoLabel}>Total Penjualan Shift</Text>
                <Text style={[styles.infoValue, { color: "#818cf8", fontWeight: "bold" }]}>
                  Rp {Number(stats?.completedRevenue || 0).toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeShiftButton}
                onPress={() =>
                  navigation.navigate("CloseShift", {
                    shiftId: shiftData.id,
                    expectedCash: Number(shiftData.openingCash) + Number(stats?.cashRevenue || 0),
                  })
                }
              >
                <Text style={styles.closeShiftText}>Tutup Shift Kasir</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.shiftClosed}>
              <Text style={styles.shiftClosedText}>Tidak ada shift aktif yang terbuka saat ini.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Keluar Sesi</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 44,
  },
  backText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#f4f4f5",
    textAlign: "center",
  },
  content: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#818cf8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    paddingBottom: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "500",
  },
  infoValue: {
    color: "#f4f4f5",
    fontSize: 13,
    fontWeight: "600",
  },
  noUserText: {
    color: "#71717a",
    textAlign: "center",
  },
  shiftDetails: {
    gap: 12,
  },
  shiftClosed: {
    alignItems: "center",
    paddingVertical: 12,
  },
  shiftClosedText: {
    color: "#71717a",
    fontSize: 13,
  },
  logoutButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#e11d48",
    borderRadius: 8,
    marginTop: 10,
  },
  logoutText: {
    color: "#e11d48",
    fontSize: 15,
    fontWeight: "600",
  },
  closeShiftButton: {
    height: 40,
    backgroundColor: "#e11d48",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  closeShiftText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
});
