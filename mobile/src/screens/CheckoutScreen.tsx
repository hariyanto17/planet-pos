import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { selectCartItems, selectCartSubtotal, selectCartCustomerName, selectCartTableId, selectCartOrderType, selectCartNotes } from "../lib/store/features/cart/selectors";
import { clearCart } from "../lib/store/features/cart/slice";
import { useCheckoutMutation } from "../lib/api/checkoutApi";
import { useGetTablesQuery } from "../lib/api/tableApi";
import { PaymentMethod } from "@shared/types";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";

type Props = StackScreenProps<RootStackParamList, "Checkout">;

export default function CheckoutScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const cartItems = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const customerName = useAppSelector(selectCartCustomerName);
  const tableId = useAppSelector(selectCartTableId);
  const orderType = useAppSelector(selectCartOrderType);
  const cartNotes = useAppSelector(selectCartNotes);

  const { data: tables = [] } = useGetTablesQuery();
  const selectedTable = tables.find((t: any) => t.id === tableId);

  // checkout configurations
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashReceivedInput, setCashReceivedInput] = useState("");

  const [checkout, { isLoading }] = useCheckoutMutation();

  const handlePlaceOrder = async () => {
    try {
      const itemsPayload = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        note: item.note || undefined,
      }));

      const receivedCash = paymentMethod === "CASH" ? Number(cashReceivedInput) : undefined;
      if (paymentMethod === "CASH" && (!receivedCash || receivedCash < subtotal)) {
        showToast({
          type: "warning",
          title: "Kesalahan Validasi",
          message: "Silakan masukkan jumlah uang diterima yang valid, lebih besar atau sama dengan subtotal.",
        });
        return;
      }

      const confirmed = await showConfirmation({
        title: "Konfirmasi Pembayaran",
        message: `Konfirmasi proses pembayaran via ${paymentMethod === "CASH" ? "TUNAI" : paymentMethod}? Total jumlah pesanan adalah Rp ${subtotal.toLocaleString()}.`,
        confirmText: "Proses Pembayaran",
        cancelText: "Batal",
        variant: "success",
      });

      if (!confirmed) return;

      const payload = {
        source: "CASHIER" as const,
        customerName: customerName || "Pelanggan Langsung",
        tableId: tableId || null,
        orderType,
        notes: cartNotes || undefined,
        items: itemsPayload,
        paymentMethod,
        receivedCash,
      };

      const result = await checkout(payload).unwrap();

      // Clear local cart
      dispatch(clearCart());

      // Route to success screen
      navigation.navigate("OrderSuccess", {
        displayNumber: result.displayNumber,
        grandTotal: result.grandTotal,
        changeAmount: result.changeAmount,
        paymentMethod: result.paymentMethod,
      });
    } catch (err) {
      console.error("Checkout failed:", err);
      showToast({
        type: "error",
        title: "Gagal Pembayaran",
        message: "Pembayaran gagal. Silakan verifikasi nominal uang tunai atau coba lagi.",
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Konfirmasi Pembayaran</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Info Pesanan</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Pelanggan</Text>
            <Text style={styles.value}>{customerName || "Langsung"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tipe Pemenuhan</Text>
            <Text style={styles.value}>{orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang"}</Text>
          </View>
          {orderType === "DINE_IN" && selectedTable && (
            <View style={styles.row}>
              <Text style={styles.label}>Lokasi Meja</Text>
              <Text style={styles.value}>{selectedTable.name}</Text>
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pilih Opsi Pembayaran</Text>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, paymentMethod === "QRIS" && styles.tabActive]}
              onPress={() => setPaymentMethod("QRIS")}
            >
              <Text style={[styles.tabText, paymentMethod === "QRIS" && styles.tabTextActive]}>QRIS Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, paymentMethod === "CASH" && styles.tabActive]}
              onPress={() => setPaymentMethod("CASH")}
            >
              <Text style={[styles.tabText, paymentMethod === "CASH" && styles.tabTextActive]}>Tunai</Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === "CASH" && (
            <View style={styles.cashForm}>
              <Text style={styles.cashLabel}>Uang Tunai Diterima (Rp)</Text>
              <TextInput
                style={styles.input}
                placeholder="mis. 100000"
                placeholderTextColor="#71717a"
                keyboardType="numeric"
                value={cashReceivedInput}
                onChangeText={setCashReceivedInput}
              />
              <Text style={styles.helperText}>Kembalian akan dihitung otomatis oleh sistem billing.</Text>
            </View>
          )}

          {paymentMethod === "QRIS" && (
            <View style={styles.qrisInfo}>
              <Text style={styles.qrisText}>Silakan pindai kode QRIS statis di meja pembayaran. Verifikasi tanda terima pembayaran sebelum menekan Konfirmasi.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Place Order CTA */}
      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Estimasi Tagihan</Text>
          <Text style={styles.priceValue}>Rp {subtotal.toLocaleString()}</Text>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handlePlaceOrder} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.confirmBtnText}>Konfirmasi & Bayar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 44,
  },
  backText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#f4f4f5",
    textAlign: "center",
  },
  content: {
    padding: 16,
    gap: 20,
  },
  summaryCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    color: "#d4d4d8",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
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
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: "#d4d4d8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  tabs: {
    flexDirection: "row",
    gap: 12,
  },
  tab: {
    flex: 1,
    height: 40,
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    borderColor: "#4f46e5",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
  },
  tabText: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  cashForm: {
    marginTop: 20,
    gap: 8,
  },
  cashLabel: {
    fontSize: 13,
    color: "#d4d4d8",
    fontWeight: "500",
  },
  input: {
    height: 40,
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#f4f4f5",
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    color: "#71717a",
    lineHeight: 15,
  },
  qrisInfo: {
    marginTop: 20,
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 12,
  },
  qrisText: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    backgroundColor: "#18181b",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    padding: 20,
    gap: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  priceValue: {
    color: "#4f46e5",
    fontSize: 18,
    fontWeight: "bold",
  },
  confirmBtn: {
    height: 46,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
