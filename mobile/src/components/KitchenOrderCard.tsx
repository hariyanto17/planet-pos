import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { formatOrderNumber } from "../lib/utils/formatters";
import { ORDER_STATUS_CONFIG, OrderStatusKey } from "../lib/utils/constants";

// Helper Timer component for calculating elapsed durations local to each card
const ElapsedTime = ({ createdAt }: { createdAt: string }) => {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const update = () => {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      const diffSecs = Math.floor(Math.max(0, diffMs) / 1000);
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      setElapsed(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>Menunggu</Text>
      <Text style={styles.timeText}>{elapsed}</Text>
    </View>
  );
};

interface KitchenOrderCardProps {
  order: any;
  onPress: () => void;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({ order, onPress }) => {
  const statusKey = (order.status || "PREPARING") as OrderStatusKey;
  const statusCfg = ORDER_STATUS_CONFIG[statusKey] || ORDER_STATUS_CONFIG.PREPARING;
  const isReady = order.status === "READY";

  const totalItemsCount = order.items
    ? order.items.reduce((sum: number, i: any) => sum + i.quantity, 0)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.card, isReady && styles.cardReady]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <Text style={styles.displayNumber}>{formatOrderNumber(order.displayNumber)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.backgroundColor }]}>
            <Text style={[styles.statusText, { color: "#ffffff" }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
        <ElapsedTime createdAt={order.createdAt} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Sumber Asal</Text>
          <Text style={[styles.value, styles.sourceHighlight]}>
            {order.source === "SELF_ORDER" ? "MANDIRI" : "KASIR"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Kuantitas</Text>
          <Text style={[styles.value, { color: "#818cf8", fontWeight: "800" }]}>
            {totalItemsCount} Item
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pelanggan</Text>
          <Text style={styles.value}>{order.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Meja</Text>
          <Text style={styles.value}>
            {order.table?.name || (order.orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tipe Pesanan</Text>
          <Text style={styles.value}>{order.orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Metode Pembayaran</Text>
          <Text style={styles.value}>
            {order.payments?.[0]?.method === "CASH" ? "💵 TUNAI" : "📱 QRIS"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardReady: {
    borderColor: "#059669",
    backgroundColor: "#064e3b",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    paddingBottom: 10,
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayNumber: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  timerContainer: {
    alignItems: "flex-end",
  },
  timerLabel: {
    fontSize: 9,
    color: "#71717a",
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  timeText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontFamily: "Courier",
    fontWeight: "bold",
  },
  cardBody: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#71717a",
    fontSize: 13,
  },
  value: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "600",
  },
  sourceHighlight: {
    color: "#e4e4e7",
    fontWeight: "bold",
    fontSize: 12,
  },
});
export default KitchenOrderCard;
