import React from "react";
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

type NavigationProp = StackNavigationProp<RootStackParamList, "KitchenHome">;

export default function KitchenHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);

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
                <Text style={[styles.sectionTitle, { color: "#10b981" }]}>
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
                <Text style={[styles.sectionTitle, { color: "#3b82f6" }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#f4f4f5",
    letterSpacing: -0.5,
  },
  userText: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBtn: {
    backgroundColor: "#18181b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  headerBtnText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "bold",
  },
  logoutBtn: {
    backgroundColor: "#7f1d1d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#b91c1c",
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
    backgroundColor: "#064e3b",
  },
  dividerBlue: {
    flex: 1,
    height: 1,
    backgroundColor: "#1e3a8a",
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f4f4f5",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#71717a",
    textAlign: "center",
    marginBottom: 16,
  },
  refreshBtn: {
    backgroundColor: "#4f46e5",
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
