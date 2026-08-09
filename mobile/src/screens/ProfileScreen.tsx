import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppSelector, useAppDispatch } from "../lib/store/hooks";
import { selectCurrentUser } from "../lib/store/features/auth/selectors";
import { logout } from "../lib/store/features/auth/slice";
import { useGetCurrentShiftQuery } from "../lib/api/shiftApi";
import { baseApi } from "../lib/api/baseApi";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";
import { useTheme, Theme } from "../theme";
import { PrinterIcon, ChevronRightIcon, LogoutIcon, UserIcon } from "../components/CustomIcons";

type Props = StackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const { data: shiftData } = useGetCurrentShiftQuery();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme, mode, setMode } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const isTablet = screenWidth > 600;

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

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* POS-Style Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Profil</Text>
          <Text style={styles.headerSubtitle}>Akun dan pengaturan</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[
          styles.scrollBody,
          isTablet && styles.scrollBodyTablet
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        {currentUser ? (
          <View style={styles.userCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{getInitials(currentUser.fullName)}</Text>
            </View>
            <View style={styles.userCardMeta}>
              <Text style={styles.userFullName}>{currentUser.fullName}</Text>
              <Text style={styles.userUsername}>Username: {currentUser.username}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{currentUser.role}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>Sesi operator tidak ditemukan</Text>
          </View>
        )}

        {/* Account Info Section */}
        {currentUser && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Informasi Akun</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nama Lengkap</Text>
                <Text style={styles.infoValue}>{currentUser.fullName}</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>{currentUser.username}</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Peran</Text>
                <Text style={styles.infoValue}>{currentUser.role}</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status Sesi</Text>
                <Text style={[styles.infoValue, { color: theme.success, fontWeight: "bold" }]}>Aktif</Text>
              </View>
            </View>
          </View>
        )}

        {/* Display Settings & Hardware */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Pengaturan & Perangkat</Text>
          <View style={styles.card}>
            {/* Theme Picker */}
            <View style={styles.themeRow}>
              <Text style={styles.infoLabel}>Mode Warna</Text>
              <View style={styles.themeSelector}>
                {(["light", "dark", "system"] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.themeOptionBtn,
                      mode === m && styles.themeOptionBtnActive,
                    ]}
                    onPress={() => setMode(m)}
                  >
                    <Text
                      style={[
                        styles.themeOptionText,
                        mode === m && styles.themeOptionTextActive,
                      ]}
                    >
                      {m === "light" && "Terang"}
                      {m === "dark" && "Gelap"}
                      {m === "system" && "Sistem"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoRowDivider} />

            {/* Printer Settings Navigation */}
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => navigation.navigate("PrinterSettings")}
            >
              <View style={styles.navRowLeft}>
                <PrinterIcon color={theme.textPrimary} />
                <Text style={styles.navRowLabel}>Printer Bluetooth</Text>
              </View>
              <ChevronRightIcon color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Cashier Shift Details */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Shift Kasir Aktif</Text>
          {isShiftOpen ? (
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status Shift</Text>
                <Text style={[styles.infoValue, { color: theme.success, fontWeight: "bold" }]}>BUKA</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dibuka Pada</Text>
                <Text style={styles.infoValue}>{formatOpenedTime(shiftData.openedAt)}</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Modal Awal</Text>
                <Text style={styles.infoValue}>Rp {Number(shiftData.openingCash).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Penjualan Tunai</Text>
                <Text style={styles.infoValue}>Rp {Number(stats?.cashRevenue || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Penjualan QRIS</Text>
                <Text style={styles.infoValue}>Rp {Number(stats?.qrisRevenue || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Pendapatan</Text>
                <Text style={[styles.infoValue, { color: theme.primary, fontWeight: "bold" }]}>
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
            <View style={[styles.card, styles.shiftClosedCard]}>
              <Text style={styles.shiftClosedText}>Tidak ada shift aktif yang terbuka.</Text>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogoutIcon color={theme.error} />
          <Text style={styles.logoutText}>Keluar Sesi</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerTextContainer: {
      gap: 2,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: theme.textPrimary,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    scrollBody: {
      padding: 16,
      gap: 20,
    },
    scrollBodyTablet: {
      alignSelf: "center",
      width: "100%",
      maxWidth: 600,
    },
    userCard: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      gap: 16,
    },
    avatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primarySoft,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.primary,
    },
    userCardMeta: {
      flex: 1,
      gap: 2,
    },
    userFullName: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.textPrimary,
    },
    userUsername: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    roleBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.surfaceSecondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: "bold",
      color: theme.textSecondary,
      textTransform: "uppercase",
    },
    errorCard: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.error,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },
    errorCardText: {
      color: theme.error,
      fontSize: 14,
    },
    section: {
      gap: 8,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: "bold",
      color: theme.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      paddingLeft: 4,
    },
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 32,
    },
    infoRowDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 10,
    },
    infoLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    infoValue: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    themeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 38,
    },
    themeSelector: {
      flexDirection: "row",
      gap: 6,
    },
    themeOptionBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSecondary,
    },
    themeOptionBtnActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    themeOptionText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "bold",
    },
    themeOptionTextActive: {
      color: "#ffffff",
    },
    navRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 38,
    },
    navRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    navRowLabel: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    shiftClosedCard: {
      alignItems: "center",
      paddingVertical: 20,
    },
    shiftClosedText: {
      color: theme.textMuted,
      fontSize: 13,
    },
    closeShiftButton: {
      height: 40,
      backgroundColor: theme.error,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
    },
    closeShiftText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "bold",
    },
    logoutButton: {
      flexDirection: "row",
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.error,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 20,
      gap: 8,
    },
    logoutText: {
      color: theme.error,
      fontSize: 14,
      fontWeight: "bold",
    },
  });
