import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { ORDER_STATUS_CONFIG, OrderStatusKey, PAYMENT_STATUS_CONFIG, PaymentStatusKey } from "../lib/utils/constants";
import { formatOrderNumber } from "../lib/utils/formatters";

interface OrderHistoryCardProps {
  order: any;
  onPress: () => void;
}

export const OrderHistoryCard: React.FC<OrderHistoryCardProps> = React.memo(({ order, onPress }) => {
  const latestPayment = order.payments?.[0];
  const paymentMethod = latestPayment?.method || "CASH";
  const paymentStatus = (latestPayment?.status || "PENDING") as PaymentStatusKey;
  const orderStatus = (order.status || "PREPARING") as OrderStatusKey;

  const totalItemsCount = order.items
    ? order.items.reduce((sum: number, i: any) => sum + i.quantity, 0)
    : 0;

  // Format business time and relative duration string
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(Math.max(0, diffMs) / 60000);
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  const orderCfg = ORDER_STATUS_CONFIG[orderStatus] || ORDER_STATUS_CONFIG.PREPARING;
  const paymentCfg = PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG.PENDING;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.orderNoContainer}>
          <Text style={styles.orderNo}>{formatOrderNumber(order.displayNumber)}</Text>
          <Text style={styles.itemsCount}>
            {totalItemsCount} Item
          </Text>
        </View>
        <Text style={styles.timeText}>
          {formatTime(order.createdAt)} • {formatRelativeTime(order.createdAt)}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Pelanggan</Text>
        <Text style={styles.value}>{order.customerName}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Lokasi / Meja</Text>
        <Text style={styles.value}>
          {order.table?.name || (order.orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang")}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Sumber & Pembayaran</Text>
        <Text style={styles.value}>
          {order.source === "SELF_ORDER" ? "Mandiri" : "Kasir"} ({paymentMethod === "CASH" ? "TUNAI" : paymentMethod})
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: orderCfg.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: orderCfg.color }]}>{orderCfg.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: paymentCfg.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: paymentCfg.color }]}>{paymentCfg.label}</Text>
          </View>
        </View>
        <Text style={styles.totalPrice}>Rp {Number(order.grandTotal).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderNoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderNo: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f4f4f5",
  },
  itemsCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#818cf8",
    backgroundColor: "rgba(129, 140, 248, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#71717a",
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  label: {
    fontSize: 12,
    color: "#71717a",
  },
  value: {
    fontSize: 12,
    color: "#e4e4e7",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    paddingTop: 10,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f4f4f5",
  },
});

export default OrderHistoryCard;
