import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { ORDER_STATUS_CONFIG, OrderStatusKey, PAYMENT_STATUS_CONFIG, PaymentStatusKey } from "../lib/utils/constants";
import { formatOrderNumber } from "../lib/utils/formatters";
import { useTheme, Theme } from "../theme";

interface OrderHistoryCardProps {
  order: any;
  onPress: () => void;
}

export const OrderHistoryCard: React.FC<OrderHistoryCardProps> = React.memo(({ order, onPress }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    if (diffMins < 60) return `${diffMins}m lalu`;
    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `${hours}j lalu`;
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  const orderCfg = ORDER_STATUS_CONFIG[orderStatus] || ORDER_STATUS_CONFIG.PREPARING;
  const paymentCfg = PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG.PENDING;

  const itemsSummary = useMemo(() => {
    if (!order.items || order.items.length === 0) return "";
    const list = order.items;
    const primaryItems = list.slice(0, 2).map((i: any) => `${i.quantity}x ${i.productName}`).join(", ");
    if (list.length > 2) {
      return `${primaryItems} + ${list.length - 2} item lainnya`;
    }
    return primaryItems;
  }, [order.items]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.orderNo}>{formatOrderNumber(order.displayNumber)}</Text>
        <View style={[styles.badge, { backgroundColor: orderCfg.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: orderCfg.color }]}>{orderCfg.label}</Text>
        </View>
      </View>

      <Text style={styles.timeText}>
        {formatTime(order.createdAt)} • {formatRelativeTime(order.createdAt)}
        {order.customerName ? ` • ${order.customerName}` : ""}
        {order.table?.name ? ` • Meja ${order.table.name}` : ""}
      </Text>

      {itemsSummary ? (
        <Text style={styles.itemsSummaryText} numberOfLines={1}>
          {itemsSummary}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.totalPrice}>Rp {Number(order.grandTotal).toLocaleString()}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.badge, { backgroundColor: paymentCfg.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: paymentCfg.color }]}>{paymentCfg.label}</Text>
          </View>
          <Text style={styles.paymentMethodText}>
            {paymentMethod === "CASH" ? "Tunai" : paymentMethod}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderNo: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  timeText: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: "500",
    marginBottom: 8,
  },
  itemsSummaryText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 8,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  paymentMethodText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: "600",
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
});

export default OrderHistoryCard;
