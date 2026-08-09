import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useKitchenOrders } from "../context/KitchenOrderContext";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { selectCurrentUser } from "../lib/store/features/auth/selectors";
import { logout } from "../lib/store/features/auth/slice";
import { baseApi } from "../lib/api/baseApi";
import KitchenOrderCard from "../components/KitchenOrderCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useTheme, Theme } from "../theme";

type NavigationProp = StackNavigationProp<RootStackParamList, "KitchenHome">;

export default function KitchenHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Consume from abstract context provider
  const { activeOrders, isLoading, isFetching, refetch } = useKitchenOrders();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
  };

  // Sort helper: oldest first (createdAt ASC)
  const sortOldestFirst = (list: any[]) => {
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  // Group by status
  const readyOrders = sortOldestFirst(activeOrders.filter((o) => o.status === "READY"));
  const preparingOrders = sortOldestFirst(activeOrders.filter((o) => o.status === "PREPARING"));

  const isQueueEmpty = readyOrders.length === 0 && preparingOrders.length === 0;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Layar Dapur</Text>
          <Text style={styles.userText}>
            {currentUser?.fullName} • {currentUser?.role}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.headerBtn, { marginRight: 8 }]} onPress={refetch}>
            <Text style={styles.headerBtnText}>Perbarui</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isQueueEmpty ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#a1a1aa" />
          }
        >
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Semua pesanan dapur selesai disiapkan.</Text>
          <Text style={styles.emptySubtitle}>Tidak ada pesanan aktif saat ini.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={refetch}>
            <Text style={styles.refreshBtnText}>Periksa Antrean</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#a1a1aa" />
          }
        >
          {/* READY Section */}
          {readyOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.success }]}>
                  SIAP ({readyOrders.length})
                </Text>
                <View style={styles.dividerGreen} />
              </View>
              {readyOrders.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate("KitchenOrderDetail", { orderId: order.id })}
                />
              ))}
            </View>
          )}

          {/* PREPARING Section */}
          {preparingOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.info }]}>
                  DISIAPKAN ({preparingOrders.length})
                </Text>
                <View style={styles.dividerBlue} />
              </View>
              {preparingOrders.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate("KitchenOrderDetail", { orderId: order.id })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.background,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  userText: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBtn: {
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
  },
  logoutBtn: {
    backgroundColor: theme.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.error,
  },
  logoutBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  dividerGreen: {
    flex: 1,
    height: 1,
    backgroundColor: theme.success,
  },
  dividerBlue: {
    flex: 1,
    height: 1,
    backgroundColor: theme.info,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: theme.background,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  refreshBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },
});
