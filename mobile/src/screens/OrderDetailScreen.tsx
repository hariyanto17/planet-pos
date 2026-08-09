import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useGetOrderQuery } from "../lib/api/orderApi";
import { useConfirmPaymentMutation } from "../lib/api/paymentApi";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useToast } from "../hooks/useToast";
import { WarningIcon, ArrowLeftIcon, PrinterIcon } from "../components/CustomIcons";
import { useTheme, Theme } from "../theme";
import PrinterService from "../services/PrinterService";

const formatOrderTime = (createdAt: string) => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  
  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `Hari Ini • ${hours}:${mins}`;
  }
  return `${date.toLocaleDateString("id-ID")} • ${hours}:${mins}`;
};

type Props = StackScreenProps<RootStackParamList, "OrderDetail">;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId, mode } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: order, isLoading, isError, refetch } = useGetOrderQuery(orderId, {
    refetchOnMountOrArgChange: true,
  });

  const [confirmPaymentMutation, { isLoading: isConfirming }] = useConfirmPaymentMutation();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePrint = async () => {
    if (!order) return;
    const isConnected = await PrinterService.isConnected();
    if (!isConnected) {
      showToast({
        type: "error",
        title: "Printer Terputus",
        message: "Silakan hubungkan printer di menu profil terlebih dahulu.",
      });
      return;
    }

    try {
      const receiptText = PrinterService.formatReceipt(order);
      const success = await PrinterService.printReceipt(receiptText);
      if (success) {
        showToast({
          type: "success",
          title: "Sukses",
          message: "Struk berhasil dicetak.",
        });
      } else {
        showToast({
          type: "error",
          title: "Cetak Gagal",
          message: "Gagal mengirim data cetak ke printer.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Cetak Gagal",
        message: "Terjadi kesalahan saat mencetak.",
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError || !order) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Tidak dapat menemukan detail tiket konsesi.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ArrowLeftIcon color={theme.textSecondary} />
            <Text style={styles.backText}>Kembali</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const pendingPayment = order.payments?.find((p: any) => p.status === "PENDING");
  const latestPayment = order.payments?.[0];
  const paymentStatus = latestPayment ? latestPayment.status : "PENDING";
  const paymentMethod = latestPayment ? latestPayment.method : "CASH";

  const handleConfirmPayment = async () => {
    if (!pendingPayment) return;
    try {
      const body: { receivedCash?: number } = {};
      if (paymentMethod === "CASH") {
        body.receivedCash = Number(pendingPayment.estimatedCash);
      }

      await confirmPaymentMutation({
        id: pendingPayment.id,
        body,
      }).unwrap();

      setConfirmVisible(false);
      // Auto return to list
      navigation.goBack();
    } catch (err) {
      console.error("Payment confirmation failed:", err);
      showToast({
        type: "error",
        title: "Kesalahan Konfirmasi",
        message: "Verifikasi sesi gagal.",
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ArrowLeftIcon color="#a1a1aa" />
            <Text style={styles.backText}>Kembali</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Pesanan #{order.displayNumber.split("-")[0]}</Text>
        <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
          <PrinterIcon color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#a1a1aa" />}
      >
        {/* Core Metadata */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Detail Konsesi</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Pelanggan</Text>
            <Text style={styles.value}>{order.customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Metode Pemenuhan</Text>
            <Text style={styles.value}>
              {order.orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lokasi Meja/Kursi</Text>
            <Text style={styles.value}>
              {order.table?.name || (order.orderType === "DINE_IN" ? "Langsung" : "Bawa Pulang")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status Pemenuhan</Text>
            <Text style={[styles.value, { color: "#4f46e5", fontWeight: "bold" }]}>{order.status === "PREPARING" ? "Disiapkan" : order.status === "READY" ? "Siap" : "Selesai"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Waktu Pesanan</Text>
            <Text style={styles.value}>{formatOrderTime(order.createdAt)}</Text>
          </View>
          {order.notes ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Instruksi Pelanggan:</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Selected Products */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Item Dipesan</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                {item.note ? (
                  <View style={[styles.noteContainer, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
                    <WarningIcon color="#ef4444" />
                    <Text style={styles.itemNote}>{item.note}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>Rp {(Number(item.unitPrice) * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Costing Breakdowns */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Ringkasan Invoice Tagihan</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>Rp {Number(order.subtotal).toLocaleString()}</Text>
          </View>
          {Number(order.discountAmount) > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Diskon promosi diterapkan</Text>
              <Text style={[styles.value, { color: "#ef4444" }]}>
                - Rp {Number(order.discountAmount).toLocaleString()}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Pajak Konsesi</Text>
            <Text style={styles.value}>Rp {Number(order.taxAmount).toLocaleString()}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: "#27272a", paddingTop: 10, marginTop: 4 }]}>
            <Text style={[styles.label, { color: "#ffffff", fontWeight: "bold" }]}>Grand Total</Text>
            <Text style={[styles.value, { color: "#4f46e5", fontSize: 16, fontWeight: "bold" }]}>
              Rp {Number(order.grandTotal).toLocaleString()}
            </Text>
          </View>

          {latestPayment && latestPayment.method === "CASH" && (
            <View style={{ gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: "#27272a", paddingTop: 10 }}>
              <View style={styles.row}>
                <Text style={styles.label}>
                  Uang Tunai Diterima
                </Text>
                <Text style={styles.value}>
                  Rp {Number(latestPayment.status === "PAID" ? latestPayment.receivedCash : latestPayment.estimatedCash).toLocaleString()}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Uang Kembalian</Text>
                <Text style={[styles.value, { color: "#10b981", fontWeight: "bold" }]}>
                  Rp {Number(latestPayment.changeAmount).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Timeline Tracks */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Linimasa Status Pesanan</Text>
          {order.timelines?.map((log: any) => (
            <View key={log.id} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.timelineStatus}>{log.status}</Text>
                <Text style={styles.timelineDesc}>{log.description}</Text>
              </View>
              <Text style={styles.timelineTime}>
                {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Confirm Payment Footer CTA for PENDING customer orders */}
      {mode !== "HISTORY" && paymentStatus === "PENDING" && pendingPayment && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => setConfirmVisible(true)}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>Konfirmasi Pembayaran Kasir</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Input Modal */}
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
                    <Text style={styles.mValue}>Rp {Number(pendingPayment?.estimatedCash).toLocaleString()}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.mLabel}>Uang Kembalian</Text>
                    <Text style={[styles.mValue, { color: "#10b981", fontWeight: "bold" }]}>
                      Rp {Number(pendingPayment?.changeAmount).toLocaleString()}
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
                    <Text style={styles.mLabel}>Jumlah Diterima</Text>
                    <Text style={styles.mValue}>Rp {Number(order.grandTotal).toLocaleString()}</Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.modalPrompt}>Apakah pembayaran telah diverifikasi dan pesanan dikirim?</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.mBtn, styles.mBtnCancel]}
                onPress={() => setConfirmVisible(false)}
                disabled={isConfirming}
              >
                <Text style={styles.mBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mBtn, styles.mBtnConfirm]}
                onPress={handleConfirmPayment}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.mBtnConfirmText}>Konfirmasi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  printBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.textPrimary,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.textPrimary,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  cardTitle: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
    color: theme.textSecondary,
    fontSize: 13,
  },
  value: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemName: {
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: "600",
  },
  noteContainer: {
    backgroundColor: theme.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  itemNote: {
    color: theme.error,
    fontSize: 11,
    fontWeight: "bold",
  },
  itemQty: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.primary,
    marginHorizontal: 16,
  },
  itemPrice: {
    fontSize: 13,
    color: theme.textSecondary,
    width: 90,
    textAlign: "right",
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 6,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
    marginTop: 6,
  },
  timelineStatus: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  timelineDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 1,
  },
  timelineTime: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 16,
    backgroundColor: theme.background,
  },
  confirmBtn: {
    backgroundColor: theme.success,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  notesBlock: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  notesLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  notesText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontStyle: "italic",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  modalDetails: {
    backgroundColor: theme.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
    marginBottom: 16,
  },
  mLabel: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  mValue: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  modalPrompt: {
    fontSize: 13,
    color: theme.textPrimary,
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
    backgroundColor: theme.surfaceSecondary,
  },
  mBtnCancelText: {
    color: theme.textSecondary,
    fontWeight: "bold",
  },
  mBtnConfirm: {
    backgroundColor: theme.success,
  },
  mBtnConfirmText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
