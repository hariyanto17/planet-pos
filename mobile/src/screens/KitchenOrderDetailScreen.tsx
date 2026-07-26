import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useGetOrderQuery, useUpdateOrderStatusMutation } from "../lib/api/orderApi";
import { useConfirmPaymentMutation } from "../lib/api/paymentApi";
import { formatCurrency, formatOrderNumber } from "../lib/utils/formatters";
import OrderItemNote from "../components/OrderItemNote";
import { ORDER_STATUS_CONFIG, OrderStatusKey } from "../lib/utils/constants";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";

type ScreenRouteProp = RouteProp<RootStackParamList, "KitchenOrderDetail">;
type NavigationProp = StackNavigationProp<RootStackParamList, "KitchenOrderDetail">;

export default function KitchenOrderDetailScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { orderId } = route.params;
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();

  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { data: order, isLoading, isError, refetch } = useGetOrderQuery(orderId, {
    refetchOnMountOrArgChange: true,
  });
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
  const [confirmPayment, { isLoading: isConfirmingPayment }] = useConfirmPaymentMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#ef4444", fontSize: 16, marginBottom: 16 }}>Gagal mengambil detail tiket.</Text>
        <TouchableOpacity
          style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#27272a", borderRadius: 6 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#a1a1aa", fontSize: 14 }}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const latestPayment = order.payments?.[0];
  const pendingPayment = order.payments?.find((p: any) => p.status === "PENDING");
  const paymentMethod = latestPayment ? latestPayment.method : "CASH";
  const statusKey = (order.status || "PREPARING") as OrderStatusKey;
  const statusCfg = ORDER_STATUS_CONFIG[statusKey] || ORDER_STATUS_CONFIG.PREPARING;

  const handleMarkAsReady = async () => {
    const confirmed = await showConfirmation({
      title: "Tandai sebagai Siap",
      message: "Apakah Anda yakin ingin menandai pesanan konsesi ini sebagai siap diambil?",
      confirmText: "Tandai Siap",
      cancelText: "Batal",
      variant: "success",
    });

    if (!confirmed) return;

    try {
      await updateOrderStatus({
        id: orderId,
        body: { status: "READY" },
      }).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to mark order as ready:", err);
      showToast({
        type: "error",
        title: "Kesalahan Operasi",
        message: "Gagal memperbarui status ke SIAP.",
      });
    }
  };

  const handleConfirmDelivery = async () => {
    if (!pendingPayment) {
      showToast({
        type: "error",
        title: "Kesalahan",
        message: "Tidak ada pembayaran tertunda untuk pesanan ini.",
      });
      return;
    }

    const confirmed = await showConfirmation({
      title: "Konfirmasi Pembayaran",
      message: "Apakah Anda yakin ingin mengonfirmasi penerimaan pembayaran tunai dan menandai pesanan konsesi ini selesai?",
      confirmText: "Konfirmasi Pembayaran",
      cancelText: "Batal",
      variant: "success",
    });

    if (!confirmed) return;

    try {
      const body: { receivedCash?: number } = {};
      if (paymentMethod === "CASH") {
        body.receivedCash = Number(pendingPayment.estimatedCash);
      }

      await confirmPayment({
        id: pendingPayment.id,
        body,
      }).unwrap();

      setConfirmVisible(false);
      // Auto return to kitchen queue
      navigation.goBack();
    } catch (err) {
      console.error("Failed to confirm payment:", err);
      showToast({
        type: "error",
        title: "Kesalahan Operasi",
        message: "Konfirmasi pembayaran gagal.",
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formatOrderNumber(order.displayNumber)}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#a1a1aa" />}
      >
        {/* Card 1: Fulfillment Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informasi Pemenuhan</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Metode Pemenuhan</Text>
            <Text style={styles.value}>{order.orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lokasi Meja</Text>
            <Text style={styles.value}>
              {order.table?.name || (order.orderType === "DINE_IN" ? "Langsung" : "Bawa Pulang")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status Antrean</Text>
            <Text style={[styles.value, { color: statusCfg.color, fontWeight: "bold" }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Card 2: Customer Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Pelanggan</Text>
            <Text style={styles.value}>{order.customerName}</Text>
          </View>
        </View>

        {/* Card 3: Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Item untuk Disiapkan</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <Text style={styles.itemName}>{item.productName}</Text>
              </View>
              <OrderItemNote note={item.note} />
            </View>
          ))}
        </View>

        {/* Card 4: Payment Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pembayaran</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Metode</Text>
            <Text style={[styles.value, { fontWeight: "900", color: "#818cf8" }]}>
              {paymentMethod === "CASH" ? "TUNAI" : "QRIS"}
            </Text>
          </View>

          {paymentMethod === "CASH" ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Total</Text>
                <Text style={styles.value}>{formatCurrency(order.grandTotal)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Uang Tunai Diterima</Text>
                <Text style={[styles.value, { fontWeight: "bold" }]}>
                  {formatCurrency(latestPayment?.status === "PAID" ? latestPayment?.receivedCash : latestPayment?.estimatedCash)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Kembalian</Text>
                <Text style={[styles.value, { color: "#10b981", fontWeight: "900", fontSize: 15 }]}>
                  {formatCurrency(latestPayment?.changeAmount)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Jumlah untuk Diterima</Text>
              <Text style={[styles.value, { color: "#818cf8", fontWeight: "900", fontSize: 15 }]}>
                {formatCurrency(order.grandTotal)}
              </Text>
            </View>
          )}
        </View>

        {/* Card 5: Notes */}
        {order.notes ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Primary Actions Button */}
      {order.status === "PREPARING" && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleMarkAsReady}
            disabled={isUpdatingStatus || isConfirmingPayment}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Tandai Siap</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {order.status === "READY" && pendingPayment && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.readyBtn}
            onPress={() => setConfirmVisible(true)}
            disabled={isUpdatingStatus || isConfirmingPayment}
          >
            <Text style={styles.readyBtnText}>Kirim & Ambil Pembayaran</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation modal */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Konfirmasi Pembayaran & Pengiriman</Text>
            <Text style={styles.modalSubtitle}>Silakan verifikasi uang tunai atau transaksi pembayaran dengan tamu.</Text>

            <View style={styles.modalDetails}>
              <View style={styles.row}>
                <Text style={styles.mLabel}>Pelanggan</Text>
                <Text style={styles.mValue}>{order.customerName}</Text>
              </View>

              {paymentMethod === "CASH" ? (
                <>
                  <View style={styles.row}>
                    <Text style={styles.mLabel}>Uang Diterima</Text>
                    <Text style={styles.mValue}>{formatCurrency(pendingPayment?.estimatedCash)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.mLabel}>Uang Kembalian</Text>
                    <Text style={[styles.mValue, { color: "#10b981", fontWeight: "bold" }]}>
                      {formatCurrency(pendingPayment?.changeAmount)}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.row}>
                    <Text style={styles.mLabel}>Metode Pembayaran</Text>
                    <Text style={styles.mValue}>QRIS</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.mLabel}>Jumlah</Text>
                    <Text style={styles.mValue}>{formatCurrency(order.grandTotal)}</Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.modalPrompt}>Apakah pembayaran telah diverifikasi dan pesanan dikirim?</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.mBtn, styles.mBtnCancel]}
                onPress={() => setConfirmVisible(false)}
                disabled={isConfirmingPayment || isUpdatingStatus}
              >
                <Text style={styles.mBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mBtn, styles.mBtnConfirm]}
                onPress={handleConfirmDelivery}
                disabled={isConfirmingPayment || isUpdatingStatus}
              >
                {isConfirmingPayment ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.mBtnConfirmText}>Konfirmasi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#18181b",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  backBtnText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f4f4f5",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 16,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    paddingBottom: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
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
  notesText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
  itemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4f46e5",
  },
  itemName: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#18181b",
    padding: 16,
    backgroundColor: "#09090b",
  },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  readyBtn: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  readyBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#71717a",
    textAlign: "center",
    marginBottom: 16,
  },
  modalDetails: {
    backgroundColor: "#09090b",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
    gap: 6,
    marginBottom: 16,
  },
  mLabel: {
    color: "#71717a",
    fontSize: 13,
  },
  mValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  modalPrompt: {
    fontSize: 13,
    color: "#e4e4e7",
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  mBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  mBtnCancel: {
    backgroundColor: "#27272a",
  },
  mBtnCancelText: {
    color: "#a1a1aa",
    fontWeight: "bold",
  },
  mBtnConfirm: {
    backgroundColor: "#059669",
  },
  mBtnConfirmText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
