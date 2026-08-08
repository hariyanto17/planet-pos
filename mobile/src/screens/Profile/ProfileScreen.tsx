import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from "react-native";
import { useAppSelector, useAppDispatch } from "../../lib/store/hooks";
import { selectCurrentUser } from "../../lib/store/features/auth/selectors";
import { logout } from "../../lib/store/features/auth/slice";
import { baseApi } from "../../lib/api/baseApi";
import { useConfirmation } from "../../hooks/useConfirmation";

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const { showConfirmation } = useConfirmation();

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
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <View style={styles.header}>
        <Text style={styles.title}>Profil Operator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Information</Text>
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Keluar Sesi</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f4f4f5",
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
    color: "#818cf8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 20,
  },
  infoGroup: {
    marginVertical: 4,
  },
  infoLabel: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  infoValue: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#27272a",
    marginVertical: 12,
  },
  noUserText: {
    color: "#71717a",
    textAlign: "center",
  },
  logoutButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#e11d48",
    borderRadius: 8,
    marginTop: 20,
  },
  logoutText: {
    color: "#e11d48",
    fontSize: 15,
    fontWeight: "600",
  },
});
