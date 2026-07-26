import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartTotalItems,
  selectCartCustomerName,
  selectCartValidatedTable,
  selectCartOrderType,
  selectCartTableId,
} from "../lib/store/features/cart/selectors";
import { updateQuantity, removeItem, updateItemNote } from "../lib/store/features/cart/slice";
import { CartItem } from "../lib/store/features/cart/types";
import { useGetTablesQuery } from "../lib/api/tableApi";

type Props = StackScreenProps<RootStackParamList, "Cart">;

export default function CartScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const totalItems = useAppSelector(selectCartTotalItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const customerName = useAppSelector(selectCartCustomerName);
  const orderType = useAppSelector(selectCartOrderType);
  const tableId = useAppSelector(selectCartTableId);

  const { data: tables = [] } = useGetTablesQuery();
  const selectedTable = tables.find((t: any) => t.id === tableId);

  // Note Modal States
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [noteInput, setNoteInput] = useState("");

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tinjau Keranjang ({totalItems})</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Customer & Fulfillment summary info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Detail Pemenuhan</Text>
          <Text style={styles.infoText}>Pelanggan: <Text style={styles.boldText}>{customerName || "Langsung"}</Text></Text>
          <Text style={styles.infoText}>Pemenuhan: <Text style={styles.boldText}>{orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang"}</Text></Text>
          {orderType === "DINE_IN" && selectedTable && (
            <Text style={styles.infoText}>Lokasi Meja: <Text style={styles.boldText}>{selectedTable.name}</Text></Text>
          )}
        </View>

        {/* Selected Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Item Keranjang</Text>
          {cartItems.map((item: CartItem, idx) => (
            <View key={`${item.productId}-${idx}`} style={styles.cartItemCard}>
              <View style={styles.itemMain}>
                <View style={styles.details}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>Rp {item.price.toLocaleString()} per item</Text>
                  {item.note ? (
                    <Text style={styles.itemNote}>Catatan: {item.note}</Text>
                  ) : null}
                </View>

                {/* Edit Note Action Button */}
                <TouchableOpacity style={styles.noteBtn} onPress={() => handleOpenNoteModal(item)}>
                  <Text style={styles.noteBtnText}>{item.note ? "Ubah Catatan" : "+ Catatan"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemFooter}>
                <Text style={styles.itemTotal}>Rp {(item.price * item.quantity).toLocaleString()}</Text>
                
                <View style={styles.qtyContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
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
                    onPress={() => {
                      dispatch(updateQuantity({ productId: item.productId, note: item.note, quantity: item.quantity + 1 }));
                    }}
                  >
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Cart Totals & Checkout Button */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalsLabel}>Estimasi Subtotal</Text>
          <Text style={styles.totalsValue}>Rp {subtotal.toLocaleString()}</Text>
        </View>
        <Text style={styles.disclaimer}>Pajak, paket promosi, dan diskon tepat akan dihitung pada invoice pembayaran.</Text>

        <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate("Checkout")}>
          <Text style={styles.checkoutBtnText}>Lanjutkan ke Pembayaran</Text>
        </TouchableOpacity>
      </View>

      {/* Item Note Modal Dialog */}
      <Modal visible={!!editingItem} transparent animationType="fade">
        <View style={styles.modalBg}>
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
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  infoTitle: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  boldText: {
    color: "#f4f4f5",
    fontWeight: "bold",
  },
  itemsSection: {
    gap: 12,
  },
  sectionTitle: {
    color: "#d4d4d8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  cartItemCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
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
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "bold",
  },
  itemPrice: {
    color: "#71717a",
    fontSize: 12,
    marginTop: 2,
  },
  itemNote: {
    color: "#eab308",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  noteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#27272a",
    borderRadius: 6,
  },
  noteBtnText: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "500",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    paddingTop: 12,
    marginTop: 4,
  },
  itemTotal: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "bold",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 2,
    gap: 10,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: "#f4f4f5",
    fontSize: 12,
    fontWeight: "bold",
  },
  qtyCount: {
    color: "#f4f4f5",
    fontSize: 13,
    fontWeight: "600",
  },
  totalsCard: {
    backgroundColor: "#18181b",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    padding: 20,
    gap: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalsLabel: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  totalsValue: {
    color: "#4f46e5",
    fontSize: 18,
    fontWeight: "bold",
  },
  disclaimer: {
    color: "#71717a",
    fontSize: 11,
    lineHeight: 15,
  },
  checkoutBtn: {
    height: 44,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f4f4f5",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#71717a",
    textAlign: "center",
    marginTop: -4,
  },
  modalInput: {
    height: 40,
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#f4f4f5",
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  mBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mBtnCancel: {
    backgroundColor: "#27272a",
  },
  mBtnCancelText: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
  },
  mBtnConfirm: {
    backgroundColor: "#4f46e5",
  },
  mBtnConfirmText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});
