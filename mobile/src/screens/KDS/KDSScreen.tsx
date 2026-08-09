import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  RefreshControl,
} from "react-native";
import { useKitchenOrders } from "../../context/KitchenOrderContext";
import { useUpdateOrderStatusMutation } from "../../lib/api/orderApi";
import { socketService } from "../../services/socket";
import { useToast } from "../../hooks/useToast";
import { useTheme, Theme } from "../../theme";

type OrderStatusType = "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
type ConnectionStatus = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";

interface OrderCardProps {
  order: any;
  onUpdateStatus: (orderId: string, nextStatus: OrderStatusType) => void;
  onCancel: (orderId: string) => void;
  styles: any;
  theme: Theme;
}

function OrderCard({ order, onUpdateStatus, onCancel, styles, theme }: OrderCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const diffMs = Date.now() - new Date(order.createdAt).getTime();
      setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 15000); // update every 15s
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const getTimerColor = () => {
    if (elapsedMinutes >= 15) return theme.error; // Urgent/Overdue
    if (elapsedMinutes >= 8) return theme.warning; // Warning
    return theme.success; // Normal
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>#{order.displayNumber}</Text>
        <Text style={[styles.timer, { color: getTimerColor() }]}>
          ⏱️ {elapsedMinutes}m
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.customerText}>
          {order.customerName} {order.table ? `• Meja ${order.table.name}` : ""}
        </Text>
        <Text style={styles.orderTypeText}>{order.orderType}</Text>

        <View style={styles.itemsList}>
          {order.items?.map((item: any, idx: number) => (
            <View key={item.id || idx} style={styles.itemRow}>
              <Text style={styles.itemName}>• {item.productName}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              {item.note ? <Text style={styles.itemNote}>({item.note})</Text> : null}
            </View>
          ))}
        </View>

        {order.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>Catatan: {order.notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(order.id)}>
          <Text style={styles.cancelBtnText}>Batal</Text>
        </TouchableOpacity>

        {order.status === "NEW" && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onUpdateStatus(order.id, "PREPARING")}
          >
            <Text style={styles.actionBtnText}>Siapkan</Text>
          </TouchableOpacity>
        )}

        {order.status === "PREPARING" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.info }]}
            onPress={() => onUpdateStatus(order.id, "READY")}
          >
            <Text style={styles.actionBtnText}>Siap Diantar</Text>
          </TouchableOpacity>
        )}

        {order.status === "READY" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.success }]}
            onPress={() => onUpdateStatus(order.id, "COMPLETED")}
          >
            <Text style={styles.actionBtnText}>Selesai</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function KDSScreen() {
  const { activeOrders, isLoading, isFetching, refetch } = useKitchenOrders();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [localOrders, setLocalOrders] = useState<any[]>([]);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    socketService.isConnected() ? "CONNECTED" : "DISCONNECTED"
  );

  // Synchronize local state with API queue
  useEffect(() => {
    if (activeOrders) {
      setLocalOrders(activeOrders);
      // Initialize seen orders so we don't trigger vibrations for existing orders
      setSeenOrderIds(new Set(activeOrders.map((o: any) => o.id)));
    }
  }, [activeOrders]);

  // Listen to Socket.IO events and connection status
  useEffect(() => {
    const handleOrderCreated = ({ order }: { order: any }) => {
      setLocalOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;

        // Vibrate only for genuinely new orders not seen in this session
        setSeenOrderIds((seen) => {
          if (!seen.has(order.id)) {
            Vibration.vibrate(500);
            seen.add(order.id);
          }
          return seen;
        });

        return [...prev, order];
      });
    };

    const handleOrderUpdated = ({ order }: { order: any }) => {
      setLocalOrders((prev) => {
        const index = prev.findIndex((o) => o.id === order.id);
        if (index >= 0) {
          const next = [...prev];
          // If order is completed or cancelled, remove from KDS active board
          if (order.status === "COMPLETED" || order.status === "CANCELLED") {
            next.splice(index, 1);
          } else {
            next[index] = order;
          }
          return next;
        } else if (order.status === "NEW" || order.status === "PREPARING" || order.status === "READY") {
          return [...prev, order];
        }
        return prev;
      });
    };

    socketService.on("order.created", handleOrderCreated);
    socketService.on("order.updated", handleOrderUpdated);

    // Connection lifecycle listeners
    const handleConnect = () => {
      console.log("[KDS Socket] Connected successfully");
      setConnectionStatus("CONNECTED");
      showToast({
        type: "success",
        title: "Koneksi Tersambung",
        message: "Koneksi realtime tersambung ke server.",
      });
      refetch();
    };

    const handleDisconnect = (reason: string) => {
      console.warn("[KDS Socket] Disconnected. Reason:", reason);
      setConnectionStatus("DISCONNECTED");
    };

    const handleConnectError = (err: any) => {
      console.error("[KDS Socket] Connection error:", err);
      setConnectionStatus("ERROR");
    };

    socketService.onConnect(handleConnect);
    socketService.onDisconnect(handleDisconnect);
    socketService.onConnectError(handleConnectError);

    // Initial check
    if (socketService.isConnected()) {
      console.log("[KDS Socket] Already connected on mount");
      setConnectionStatus("CONNECTED");
    } else {
      console.log("[KDS Socket] Not connected on mount, current status: CONNECTING");
      setConnectionStatus("CONNECTING");
    }

    return () => {
      socketService.off("order.created", handleOrderCreated);
      socketService.off("order.updated", handleOrderUpdated);
      socketService.offConnect(handleConnect);
      socketService.offDisconnect(handleDisconnect);
      socketService.offConnectError(handleConnectError);
    };
  }, [refetch]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatusType) => {
    try {
      await updateOrderStatus({ id: orderId, body: { status: nextStatus } }).unwrap();
      showToast({
        type: "success",
        title: "Berhasil",
        message: `Status pesanan berhasil diperbarui ke ${nextStatus}`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Gagal",
        message: err?.data?.message || "Gagal memperbarui status.",
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    AlertConfirm(
      "Batalkan Pesanan",
      "Apakah Anda yakin ingin membatalkan pesanan ini?",
      async () => {
        try {
          await updateOrderStatus({ id: orderId, body: { status: "CANCELLED" } }).unwrap();
          showToast({
            type: "success",
            title: "Berhasil",
            message: "Pesanan berhasil dibatalkan.",
          });
        } catch (err: any) {
          showToast({
            type: "error",
            title: "Gagal",
            message: err?.data?.message || "Gagal membatalkan pesanan.",
          });
        }
      }
    );
  };

  const AlertConfirm = (title: string, msg: string, onConfirm: () => void) => {
    const Alert = require("react-native").Alert;
    Alert.alert(title, msg, [
      { text: "Batal", style: "cancel" },
      { text: "Ya", style: "destructive", onPress: onConfirm },
    ]);
  };

  // Filter columns
  const newOrders = useMemo(() => localOrders.filter((o) => o.status === "NEW"), [localOrders]);
  const preparingOrders = useMemo(() => localOrders.filter((o) => o.status === "PREPARING"), [localOrders]);
  const readyOrders = useMemo(() => localOrders.filter((o) => o.status === "READY"), [localOrders]);

  if (isLoading && localOrders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#818cf8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* Realtime connection status banner */}
      {connectionStatus !== "CONNECTED" && (
        <View style={styles.connectionAlertBanner}>
          <Text style={styles.connectionAlertText}>
            ⚠️ KDS tidak terhubung ke server realtime
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Layar Dapur (KDS)</Text>
          <View style={styles.connectionBadgeContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: connectionStatus === "CONNECTED" ? "#10b981" : "#ef4444" },
              ]}
            />
            <Text style={styles.connectionStatusText}>
              {connectionStatus === "CONNECTED" && "Realtime tersambung"}
              {connectionStatus === "CONNECTING" && "Menghubungkan..."}
              {connectionStatus === "DISCONNECTED" && "Koneksi terputus"}
              {connectionStatus === "ERROR" && "Kesalahan koneksi"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refetch}>
          <Text style={styles.refreshBtnText}>Perbarui</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardContent}
      >
        {/* Column 1: Order Masuk (NEW) */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Order Masuk ({newOrders.length})</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.columnScroll}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#818cf8" />
            }
          >
            {newOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onUpdateStatus={handleUpdateStatus}
                onCancel={handleCancelOrder}
                styles={styles}
                theme={theme}
              />
            ))}
            {newOrders.length === 0 && <Text style={styles.emptyText}>Kosong</Text>}
          </ScrollView>
        </View>

        {/* Column 2: Sedang Disiapkan (PREPARING) */}
        <View style={styles.column}>
          <Text style={[styles.columnHeader, { color: theme.info }]}>
            Sedang Disiapkan ({preparingOrders.length})
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.columnScroll}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#818cf8" />
            }
          >
            {preparingOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onUpdateStatus={handleUpdateStatus}
                onCancel={handleCancelOrder}
                styles={styles}
                theme={theme}
              />
            ))}
            {preparingOrders.length === 0 && <Text style={styles.emptyText}>Kosong</Text>}
          </ScrollView>
        </View>

        {/* Column 3: Siap Diantar (READY) */}
        <View style={styles.column}>
          <Text style={[styles.columnHeader, { color: theme.success }]}>
            Siap Diantar ({readyOrders.length})
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.columnScroll}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#818cf8" />
            }
          >
            {readyOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onUpdateStatus={handleUpdateStatus}
                onCancel={handleCancelOrder}
                styles={styles}
                theme={theme}
              />
            ))}
            {readyOrders.length === 0 && <Text style={styles.emptyText}>Kosong</Text>}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
  },
  connectionAlertBanner: {
    backgroundColor: theme.error,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  connectionAlertText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  connectionBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionStatusText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  refreshBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
  },
  boardContent: {
    padding: 16,
    gap: 16,
  },
  column: {
    width: 280,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  columnHeader: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  columnScroll: {
    gap: 12,
    paddingBottom: 20,
  },
  emptyText: {
    color: theme.textMuted,
    textAlign: "center",
    fontSize: 12,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNumber: {
    color: theme.textPrimary,
    fontWeight: "bold",
    fontSize: 14,
  },
  timer: {
    fontSize: 11,
    fontWeight: "bold",
  },
  cardBody: {
    gap: 4,
  },
  customerText: {
    color: theme.textPrimary,
    fontWeight: "600",
    fontSize: 13,
  },
  orderTypeText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  itemsList: {
    marginTop: 6,
    gap: 3,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 12,
    flex: 1,
  },
  itemQty: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  itemNote: {
    color: theme.error,
    fontSize: 10,
    marginLeft: 4,
  },
  notesBox: {
    marginTop: 6,
    backgroundColor: theme.error + "15",
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.error + "30",
  },
  notesText: {
    color: theme.error,
    fontSize: 11,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: theme.error,
    backgroundColor: theme.error + "15",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: theme.error,
    fontSize: 11,
    fontWeight: "bold",
  },
  actionBtn: {
    flex: 2,
    height: 32,
    backgroundColor: theme.primary,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
});
