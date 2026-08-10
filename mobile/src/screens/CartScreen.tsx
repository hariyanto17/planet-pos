import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, useWindowDimensions, TouchableWithoutFeedback } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { useTheme, Theme } from "../theme";
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartTotalItems,
  selectCartCustomerName,
  selectCartOrderType,
  selectCartTableId,
  selectCartNotes,
} from "../lib/store/features/cart/selectors";
import { updateQuantity, removeItem, updateItemNote, clearCart, setCustomerInfo } from "../lib/store/features/cart/slice";
import { CartItem } from "../lib/store/features/cart/types";
import { useGetTablesQuery } from "../lib/api/tableApi";
import { useCheckoutMutation } from "../lib/api/checkoutApi";
import { useLazyGetOrderQuery } from "../lib/api/orderApi";
import { useGetProductsQuery } from "../lib/api/productApi";
import { PaymentMethod, OrderType } from "@shared/types";
import { useToast } from "../hooks/useToast";
import PrinterService from "../services/PrinterService";

type Props = StackScreenProps<RootStackParamList, "Cart">;

export default function CartScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth > 600;

  // Cart selectors
  const cartItems = useAppSelector(selectCartItems);
  const totalItems = useAppSelector(selectCartTotalItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const customerName = useAppSelector(selectCartCustomerName);
  const orderType = useAppSelector(selectCartOrderType);
  const tableId = useAppSelector(selectCartTableId);
  const cartNotes = useAppSelector(selectCartNotes);

  const { data: tables = [] } = useGetTablesQuery();
  const { data: products = [] } = useGetProductsQuery({ sellable: true });
  const selectedTable = tables.find((t: any) => t.id === tableId);
  const activeTables = useMemo(() => tables.filter((t: any) => t.isActive), [tables]);

  const handleSetOrderType = (type: OrderType) => {
    dispatch(
      setCustomerInfo({
        customerName,
        orderType: type,
        tableId: type === "DINE_IN" ? tableId : null,
      })
    );
  };

  const handleSetTableId = (id: string | null) => {
    dispatch(
      setCustomerInfo({
        customerName,
        orderType,
        tableId: id,
      })
    );
  };

  // Note Modal States
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [noteInput, setNoteInput] = useState("");

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashReceivedInput, setCashReceivedInput] = useState("");

  // API mutations & lazy queries
  const [checkout, { isLoading: isCheckoutLoading }] = useCheckoutMutation();
  const [getOrderTrigger] = useLazyGetOrderQuery();

  const handleOpenNoteModal = (item: CartItem) => {
    setEditingItem(item);
    setNoteInput(item.note || "");
  };

  const handleSaveNote = () => {
    if (editingItem) {
      dispatch(
        updateItemNote({
          productId: editingItem.productId,
          oldNote: editingItem.note,
          newNote: noteInput.trim(),
        })
      );
      setEditingItem(null);
    }
  };

  // Payment derivations
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

  // Dynamic cash suggestions
  const cashSuggestions = useMemo(() => {
    const suggestions: number[] = [subtotal];
    const denominations = [10000, 20000, 50000, 100000];

    denominations.forEach((denom) => {
      if (denom > subtotal && !suggestions.includes(denom)) {
        suggestions.push(denom);
      }
    });

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

  // Printing Helper (Asynchronous background printing)
  const printOrderReceipt = async (orderId: string) => {
    try {
      const orderData = await getOrderTrigger(orderId).unwrap();
      const isConnected = await PrinterService.isConnected();
      if (!isConnected) {
        showToast({
          type: "warning",
          title: "Printer Terputus",
          message: "Pesanan berhasil, printer sedang offline.",
        });
        return;
      }
      const receiptText = PrinterService.formatReceipt(orderData);
      await PrinterService.printReceipt(receiptText);
    } catch (error) {
      console.error("Auto print error:", error);
    }
  };

  // Main ORDER handler
  const handlePlaceOrder = async () => {
    if (isCheckoutLoading) return;

    if (cartItems.length === 0) {
      showToast({
        type: "warning",
        title: "Keranjang Kosong",
        message: "Silakan pilih produk terlebih dahulu.",
      });
      return;
    }

    if (paymentMethod === "CASH" && receivedCash < subtotal) {
      showToast({
        type: "warning",
        title: "Kesalahan Validasi",
        message: `Silakan masukkan nominal pembayaran minimal Rp ${subtotal.toLocaleString()}.`,
      });
      return;
    }

    try {
      const itemsPayload = cartItems.map((item) => ({
        productId: item.productId,
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

      // Trigger automatic printing in background (non-blocking)
      printOrderReceipt(result.orderId).catch((err) =>
        console.error("Background print error:", err)
      );

      // Clear local cart and inputs
      dispatch(clearCart());
      setCashReceivedInput("");

      showToast({
        type: "success",
        title: "Sukses",
        message: "Pesanan berhasil diproses.",
      });

      // Instantly reset navigation stack to return to Home (CashierTabs)
      navigation.reset({
        index: 0,
        routes: [{ name: "CashierTabs" }],
      });
    } catch (err: any) {
      console.error("Order creation failed:", err);
      const errMsg = err?.data?.message || "Gagal memproses transaksi. Silakan coba lagi.";
      showToast({
        type: "error",
        title: "Gagal Membuat Pesanan",
        message: errMsg,
      });
    }
  };

  const isOrderBtnDisabled = isCheckoutLoading || cartItems.length === 0 || isCashInsufficient;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isCheckoutLoading}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tinjau Keranjang ({totalItems})</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainLayout, isTablet && styles.mainLayoutTablet]}>

          {/* Left Column: Items */}
          <View style={styles.leftColumn}>
            {/* Fulfillment Detail Info */}


            {/* Cart Items List */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Item Keranjang</Text>
              {cartItems.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateText}>Keranjang Anda kosong</Text>
                </View>
              ) : (
                cartItems.map((item: CartItem, idx) => (
                  <View key={`${item.productId}-${idx}`} style={styles.cartItemCard}>
                    <View style={styles.itemMain}>
                      <View style={styles.details}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        <Text style={styles.itemPrice}>Rp {item.price.toLocaleString()} per item</Text>
                        {item.note ? (
                          <Text style={styles.itemNote}>Catatan: {item.note}</Text>
                        ) : null}
                      </View>

                      <TouchableOpacity style={styles.noteBtn} onPress={() => handleOpenNoteModal(item)} disabled={isCheckoutLoading}>
                        <Text style={styles.noteBtnText}>{item.note ? "Ubah Catatan" : "+ Catatan"}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itemFooter}>
                      <Text style={styles.itemTotal}>Rp {(item.price * item.quantity).toLocaleString()}</Text>

                      <View style={styles.qtyContainer}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          disabled={isCheckoutLoading}
                          onPress={() => {
                            if (item.quantity === 1) {
                              dispatch(removeItem({ productId: item.productId, note: item.note }));
                            } else {
                              dispatch(updateQuantity({ productId: item.productId, note: item.note, quantity: item.quantity - 1 }));
                            }
                          }}
                        >
                          <Text style={styles.qtyText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyCount}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          disabled={isCheckoutLoading}
                          onPress={() => {
                            const product = products.find((p: any) => p.id === item.productId);
                            if (product && product.trackInventory && product.availableStock !== null && product.availableStock !== undefined) {
                              if (item.quantity >= product.availableStock) {
                                showToast({
                                  type: "warning",
                                  title: "Stok Terbatas",
                                  message: `Stok tersedia hanya ${product.availableStock}.`,
                                });
                                return;
                              }
                            }
                            dispatch(updateQuantity({ productId: item.productId, note: item.note, quantity: item.quantity + 1 }));
                          }}
                        >
                          <Text style={styles.qtyText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Right Column: Checkout workspace */}
          <View style={styles.rightColumn}>
            {/* Last Success Print Retry Banner */}


            {/* Subtotal card */}
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalsLabel}>TOTAL</Text>
                <Text style={styles.totalsValue}>Rp {subtotal.toLocaleString()}</Text>
              </View>
              <Text style={styles.disclaimer}>Diskon & Pajak akhir dihitung otomatis oleh billing backend.</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Detail Pemenuhan</Text>

              <View style={styles.customerRow}>
                <Text style={styles.infoText}>Pelanggan: <Text style={styles.boldText}>{customerName || "Langsung"}</Text></Text>
              </View>

              <View style={styles.typeTabs}>
                <TouchableOpacity
                  style={[styles.typeTab, orderType === "DINE_IN" && styles.typeTabActive]}
                  onPress={() => handleSetOrderType("DINE_IN")}
                >
                  <Text style={[styles.typeTabText, orderType === "DINE_IN" && styles.typeTabTextActive]}>
                    Makan di Sini
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeTab, orderType === "TAKEAWAY" && styles.typeTabActive]}
                  onPress={() => handleSetOrderType("TAKEAWAY")}
                >
                  <Text style={[styles.typeTabText, orderType === "TAKEAWAY" && styles.typeTabTextActive]}>
                    Bawa Pulang
                  </Text>
                </TouchableOpacity>
              </View>

              {orderType === "DINE_IN" && (
                <View style={styles.tablesWrapper}>
                  <Text style={styles.tablesLabel}>Lokasi Meja</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScroll}>
                    <TouchableOpacity
                      style={[styles.tablePill, tableId === null && styles.tablePillActive]}
                      onPress={() => handleSetTableId(null)}
                    >
                      <Text style={[styles.tablePillText, tableId === null && styles.tablePillTextActive]}>
                        Langsung
                      </Text>
                    </TouchableOpacity>
                    {activeTables.map((t: any) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.tablePill, tableId === t.id && styles.tablePillActive]}
                        onPress={() => handleSetTableId(t.id)}
                      >
                        <Text style={[styles.tablePillText, tableId === t.id && styles.tablePillTextActive]}>
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Payment Section Card */}
            <View style={styles.paymentCard}>
              <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, paymentMethod === "CASH" && styles.tabActive]}
                  onPress={() => !isCheckoutLoading && setPaymentMethod("CASH")}
                  disabled={isCheckoutLoading}
                >
                  <Text style={[styles.tabText, paymentMethod === "CASH" && styles.tabTextActive]}>TUNAI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, paymentMethod === "QRIS" && styles.tabActive]}
                  onPress={() => !isCheckoutLoading && setPaymentMethod("QRIS")}
                  disabled={isCheckoutLoading}
                >
                  <Text style={[styles.tabText, paymentMethod === "QRIS" && styles.tabTextActive]}>QRIS</Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === "CASH" && (
                <View style={styles.cashForm}>
                  <Text style={styles.cashLabel}>Jumlah Pembayaran (Rp)</Text>
                  <TextInput
                    style={[styles.input, isCashInsufficient && styles.inputWarning]}
                    placeholder="mis. 50000"
                    placeholderTextColor="#71717a"
                    keyboardType="numeric"
                    value={cashReceivedInput}
                    onChangeText={setCashReceivedInput}
                    editable={!isCheckoutLoading}
                  />

                  {/* Quick cash suggest */}
                  <View style={styles.suggestionsRow}>
                    {cashSuggestions.map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        style={styles.suggestionPill}
                        onPress={() => !isCheckoutLoading && setCashReceivedInput(amount.toString())}
                        disabled={isCheckoutLoading}
                      >
                        <Text style={styles.suggestionPillText}>
                          {amount === subtotal ? "Uang Pas" : `Rp ${amount.toLocaleString()}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.changeRow}>
                    <Text style={styles.changeLabel}>Kembalian</Text>
                    <Text style={[styles.changeValue, isCashInsufficient && styles.changeValueZero]}>
                      Rp {changeAmount.toLocaleString()}
                    </Text>
                  </View>

                  {/* Warning feedback */}
                  {isCashInsufficient && cashReceivedInput.trim().length > 0 && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>
                        Uang diterima kurang Rp {cashShortage.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {paymentMethod === "QRIS" && (
                <View style={styles.qrisInfo}>
                  <Text style={styles.qrisText}>
                    Verifikasi pembayaran QRIS statis di meja pembayaran telah sukses sebelum melakukan order.
                  </Text>
                </View>
              )}
            </View>

            {/* ORDER button */}
            <View style={styles.orderButtonContainer}>
              <TouchableOpacity
                style={[styles.orderBtn, isOrderBtnDisabled && styles.orderBtnDisabled]}
                onPress={handlePlaceOrder}
                disabled={isOrderBtnDisabled}
              >
                {isCheckoutLoading ? (
                  <View style={styles.processingRow}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.orderBtnText}>Memproses...</Text>
                  </View>
                ) : (
                  <Text style={styles.orderBtnText}>ORDER</Text>
                )}
              </TouchableOpacity>
              {isCheckoutLoading && (
                <Text style={styles.processingNotice}>
                  Memproses transaksi. Jangan tutup aplikasi atau kembali.
                </Text>
              )}
            </View>

          </View>
        </View>
      </ScrollView>

      {/* Note Modal Dialog */}
      <Modal visible={!!editingItem} transparent animationType="fade" onRequestClose={() => setEditingItem(null)}>
        <TouchableWithoutFeedback onPress={() => setEditingItem(null)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Catatan Khusus Item</Text>
                <Text style={styles.modalSubtitle}>{editingItem?.productName}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="mis. Sedikit es, tanpa bawang, dll."
                  placeholderTextColor="#71717a"
                  value={noteInput}
                  onChangeText={setNoteInput}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.mBtn, styles.mBtnCancel]} onPress={() => setEditingItem(null)}>
                    <Text style={styles.mBtnCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.mBtn, styles.mBtnConfirm]} onPress={handleSaveNote}>
                    <Text style={styles.mBtnConfirmText}>Simpan Catatan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingBottom: 40,
  },
  mainLayout: {
    flexDirection: "column",
    gap: 16,
  },
  mainLayoutTablet: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  leftColumn: {
    flex: 1,
    gap: 16,
  },
  rightColumn: {
    flex: 1,
    gap: 16,
    minWidth: 320,
  },
  infoCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  infoTitle: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  boldText: {
    color: theme.textPrimary,
    fontWeight: "bold",
  },
  itemsSection: {
    gap: 12,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  emptyStateCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
  },
  emptyStateText: {
    color: theme.textMuted,
    fontSize: 14,
  },
  cartItemCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  itemMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  details: {
    flex: 1,
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "bold",
  },
  itemPrice: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemNote: {
    color: theme.warning,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  noteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 6,
  },
  noteBtnText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
    marginTop: 4,
  },
  itemTotal: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "bold",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surfaceSecondary,
  },
  qtyText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
  qtyCount: {
    paddingHorizontal: 12,
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "bold",
  },
  retryBanner: {
    backgroundColor: theme.warning + "15",
    borderWidth: 1,
    borderColor: theme.warning + "40",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 10,
  },
  retryBannerText: {
    color: theme.warning,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  retryBannerBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryBannerBtnText: {
    color: theme.warning,
    fontSize: 12,
    fontWeight: "bold",
  },
  totalsCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalsLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "bold",
  },
  totalsValue: {
    color: theme.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  disclaimer: {
    fontSize: 11,
    color: theme.textMuted,
    lineHeight: 15,
  },
  paymentCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
  },
  tabs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
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
    gap: 10,
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
    backgroundColor: theme.error + "10",
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
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
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 4,
  },
  changeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 32,
  },
  changeLabel: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.success,
  },
  changeValueZero: {
    color: theme.textSecondary,
  },
  warningBox: {
    backgroundColor: theme.error + "10",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.error + "30",
  },
  warningText: {
    color: theme.error,
    fontSize: 12,
    fontWeight: "bold",
  },
  qrisInfo: {
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
  orderButtonContainer: {
    gap: 8,
  },
  orderBtn: {
    height: 48,
    backgroundColor: theme.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBtnDisabled: {
    backgroundColor: theme.border,
    opacity: 0.6,
  },
  orderBtnText: {
    color: "#ffffff",
    fontSize: 16,
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
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  modalInput: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  mBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  mBtnCancel: {
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mBtnCancelText: {
    color: theme.textSecondary,
    fontWeight: "600",
  },
  mBtnConfirm: {
    backgroundColor: theme.primary,
  },
  mBtnConfirmText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  customerRow: {
    marginBottom: 8,
  },
  typeTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeTab: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  typeTabActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  typeTabText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  typeTabTextActive: {
    color: theme.textPrimary,
  },
  tablesWrapper: {
    gap: 6,
    marginTop: 4,
  },
  tablesLabel: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableScroll: {
    gap: 6,
  },
  tablePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
  },
  tablePillActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  tablePillText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  tablePillTextActive: {
    color: "#ffffff",
  },
});
