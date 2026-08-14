import React, { useState, useMemo } from "react";
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
import { useTheme, Theme } from "../theme";

type Props = StackScreenProps<RootStackParamList, "Checkout">;

export default function CheckoutScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
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

  const receivedCash = useMemo(() => {
    return Number(cashReceivedInput) || 0;
  }, [cashReceivedInput]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== "CASH") return 0;
    const diff = receivedCash - subtotal;
    return diff > 0 ? diff : 0;
  }, [paymentMethod, receivedCash, subtotal]);

  const isCashInsufficient = useMemo(() => {
    if (paymentMethod !== "CASH") return false;
    return receivedCash < subtotal;
  }, [paymentMethod, receivedCash, subtotal]);

  const cashShortage = useMemo(() => {
    if (paymentMethod !== "CASH") return 0;
    return subtotal - receivedCash;
  }, [paymentMethod, receivedCash, subtotal]);

  // Dynamic quick-cash suggestions
  const cashSuggestions = useMemo(() => {
    const suggestions: number[] = [subtotal]; // Exact Amount is always first
    
    // Add next high-tier standard denominations
    const denominations = [10000, 20000, 50000, 100000];
    denominations.forEach((denom) => {
      if (denom > subtotal && !suggestions.includes(denom)) {
        suggestions.push(denom);
      }
    });

    // If subtotal is very high (e.g. 120k), offer next round 50k / 100k increments
    const next50k = Math.ceil(subtotal / 50000) * 50000;
    if (next50k > subtotal && !suggestions.includes(next50k)) {
      suggestions.push(next50k);
    }
    const next100k = Math.ceil(subtotal / 100000) * 100000;
    if (next100k > subtotal && !suggestions.includes(next100k)) {
      suggestions.push(next100k);
    }

    return suggestions.slice(0, 4).sort((a, b) => a - b);
  }, [subtotal]);

  const handlePlaceOrder = async () => {
    if (isLoading) return;

    if (paymentMethod === "CASH" && receivedCash < subtotal) {
      showToast({
        type: "warning",
        title: "Kesalahan Validasi",
        message: `Silakan masukkan jumlah uang diterima minimal Rp ${subtotal.toLocaleString()}.`,
      });
      return;
    }

    try {
      const itemsPayload = cartItems.map((item) => ({
        sellableProductId: item.sellableProductId,
        quantity: item.quantity,
        note: item.note || undefined,
      }));

      const payload = {
        source: "CASHIER" as const,
        customerName: customerName || "Pelanggan Langsung",
        tableId: tableId || null,
        orderType,
        notes: cartNotes || undefined,
        items: itemsPayload,
        paymentMethod,
        receivedCash: paymentMethod === "CASH" ? receivedCash : undefined,
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
        orderId: result.orderId,
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

  const isButtonDisabled = isLoading || isCashInsufficient;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isLoading}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pembayaran</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Pembayaran Hero Card */}
        <View style={styles.totalHeroCard}>
          <Text style={styles.totalHeroLabel}>TOTAL PEMBAYARAN</Text>
          <Text style={styles.totalHeroValue}>Rp {subtotal.toLocaleString()}</Text>
        </View>

        {/* Info Pesanan & Items Review (Merged Screen) */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Detail Pesanan</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Pelanggan</Text>
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

          <View style={styles.divider} />

          {/* Inline Items Review */}
          <Text style={styles.itemsReviewTitle}>Item Pesanan ({cartItems.length})</Text>
          {cartItems.map((item, index) => (
            <View key={`${item.sellableProductId}-${index}`} style={styles.itemSummaryRow}>
              <View style={styles.itemSummaryInfo}>
                <Text style={styles.itemSummaryQty}>{item.quantity}x</Text>
                <Text style={styles.itemSummaryName} numberOfLines={1}>
                  {item.productName}
                </Text>
              </View>
              <Text style={styles.itemSummaryPrice}>
                Rp {(item.price * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, paymentMethod === "CASH" && styles.tabActive]}
              onPress={() => !isLoading && setPaymentMethod("CASH")}
              disabled={isLoading}
            >
              <Text style={[styles.tabText, paymentMethod === "CASH" && styles.tabTextActive]}>Tunai</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, paymentMethod === "QRIS" && styles.tabActive]}
              onPress={() => !isLoading && setPaymentMethod("QRIS")}
              disabled={isLoading}
            >
              <Text style={[styles.tabText, paymentMethod === "QRIS" && styles.tabTextActive]}>QRIS Manual</Text>
            </TouchableOpacity>
          </View>

          {/* Cash Payment Options */}
          {paymentMethod === "CASH" && (
            <View style={styles.cashForm}>
              <Text style={styles.cashLabel}>Uang Diterima (Rp)</Text>
              <TextInput
                style={[styles.input, isCashInsufficient && styles.inputWarning]}
                placeholder="mis. 50000"
                placeholderTextColor="#71717a"
                keyboardType="numeric"
                value={cashReceivedInput}
                onChangeText={setCashReceivedInput}
                editable={!isLoading}
              />

              {/* Quick Cash Suggestions */}
              <View style={styles.suggestionsRow}>
                {cashSuggestions.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.suggestionPill}
                    onPress={() => !isLoading && setCashReceivedInput(amount.toString())}
                    disabled={isLoading}
                  >
                    <Text style={styles.suggestionPillText}>
                      {amount === subtotal ? "Uang Pas" : `Rp ${amount.toLocaleString()}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Kembalian</Text>
                <Text style={[styles.changeValue, isCashInsufficient && styles.changeValueZero]}>
                  Rp {changeAmount.toLocaleString()}
                </Text>
              </View>

              {/* Live validation feedback */}
              {isCashInsufficient && cashReceivedInput.trim().length > 0 && (
                <View style={styles.validationWarningContainer}>
                  <Text style={styles.validationWarningText}>
                    Uang diterima kurang Rp {cashShortage.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* QRIS Instructions */}
          {paymentMethod === "QRIS" && (
            <View style={styles.qrisInfo}>
              <Text style={styles.qrisText}>
                Silakan arahkan pelanggan untuk memindai kode QRIS statis di meja kasir. 
                Pastikan tanda terima/notifikasi transaksi sukses sebelum menekan tombol Bayar Sekarang.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Place Order CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, isButtonDisabled && styles.confirmBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.confirmBtnText}>Memproses...</Text>
            </View>
          ) : (
            <Text style={styles.confirmBtnText}>BAYAR SEKARANG</Text>
          )}
        </TouchableOpacity>
        {isLoading && (
          <Text style={styles.processingNotice}>
            Mohon tunggu, jangan tutup aplikasi atau tekan kembali.
          </Text>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    backgroundColor: theme.background,
  },
  backBtn: {
    width: 64,
  },
  backText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
    textAlign: "center",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  totalHeroCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  totalHeroLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: theme.textSecondary,
    letterSpacing: 1,
  },
  totalHeroValue: {
    fontSize: 28,
    fontWeight: "900",
    color: theme.primary,
  },
  summaryCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 12,
  },
  itemsReviewTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  itemSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemSummaryInfo: {
    flexDirection: "row",
    flex: 1,
    gap: 8,
    alignItems: "center",
  },
  itemSummaryQty: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textSecondary,
  },
  itemSummaryName: {
    fontSize: 13,
    color: theme.textPrimary,
    flex: 1,
  },
  itemSummaryPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textPrimary,
  },
  sectionCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  tabs: {
    flexDirection: "row",
    gap: 12,
  },
  tab: {
    flex: 1,
    height: 44,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  tabText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "bold",
  },
  tabTextActive: {
    color: theme.primary,
  },
  cashForm: {
    marginTop: 16,
    gap: 12,
  },
  cashLabel: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  input: {
    height: 44,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  inputWarning: {
    borderColor: theme.error,
    backgroundColor: theme.error + "10", // 10% opacity
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  suggestionPillText: {
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: "500",
  },
  changeValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.success,
  },
  changeValueZero: {
    color: theme.textSecondary,
  },
  validationWarningContainer: {
    backgroundColor: theme.error + "10",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.error + "30",
  },
  validationWarningText: {
    color: theme.error,
    fontSize: 12,
    fontWeight: "bold",
  },
  qrisInfo: {
    marginTop: 16,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
  },
  qrisText: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 16,
    gap: 8,
  },
  confirmBtn: {
    height: 48,
    backgroundColor: theme.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: theme.border,
    opacity: 0.6,
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  processingNotice: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
