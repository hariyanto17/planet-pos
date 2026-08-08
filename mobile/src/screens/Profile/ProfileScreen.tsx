import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from "react-native";
import { useAppSelector, useAppDispatch } from "../../lib/store/hooks";
import { selectCurrentUser } from "../../lib/store/features/auth/selectors";
import { logout } from "../../lib/store/features/auth/slice";
import { baseApi } from "../../lib/api/baseApi";
import { useConfirmation } from "../../hooks/useConfirmation";
import { useTheme, Theme } from "../../theme";

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const { showConfirmation } = useConfirmation();
  const { theme, mode, setMode } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLogout = async () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View style={styles.header}>
        <Text style={styles.title}>Profil Operator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informasi Akun</Text>
        </View>

        {currentUser ? (
          <View style={styles.card}>
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{currentUser.username}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{currentUser.role}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.noUserText}>Tidak ada sesi dapur aktif</Text>
          </View>
        )}

        {/* Display Theme Picker */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tema Tampilan</Text>
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.infoLabel}>Mode Warna</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
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
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Keluar Sesi</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.textPrimary,
    },
    content: {
      padding: 20,
      gap: 16,
    },
    sectionHeader: {
      marginTop: 10,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 20,
    },
    infoGroup: {
      marginVertical: 4,
    },
    infoLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "500",
      marginBottom: 4,
    },
    infoValue: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 12,
    },
    noUserText: {
      color: theme.textMuted,
      textAlign: "center",
    },
    logoutButton: {
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.error,
      borderRadius: 8,
      marginTop: 20,
    },
    logoutText: {
      color: theme.error,
      fontSize: 15,
      fontWeight: "600",
    },
    themeOptionBtn: {
      paddingHorizontal: 10,
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
      fontSize: 11,
      fontWeight: "bold",
    },
    themeOptionTextActive: {
      color: "#ffffff",
    },
  });
