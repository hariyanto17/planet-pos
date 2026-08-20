import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
} from "react-native";
import {
  useGetStockTransfersQuery,
  useGetWarehousesQuery,
  useTransferStockMutation,
  useCompleteStockTransferMutation,
} from "../../lib/api/inventoryApi";
import { useGetProductsQuery } from "../../lib/api/productApi";
import { useToast } from "../../hooks/useToast";
import { useConfirmation } from "../../hooks/useConfirmation";
import { useTheme, Theme } from "../../theme";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentUser } from "../../lib/store/features/auth/selectors";
import { getAvailableUnits, getDefaultUnit, formatConversionPreview } from "../../lib/utils/unitConversions";

export default function WarehouseTransfersScreen() {
  const currentUser = useAppSelector(selectCurrentUser);
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Queries
  const { data: transfers, isLoading: isLoadingTransfers, isFetching: isFetchingTransfers, refetch: refetchTransfers } = useGetStockTransfersQuery();
  const { data: warehouses } = useGetWarehousesQuery();
  const { data: allProducts } = useGetProductsQuery();

  // Mutations
  const [transferStock, { isLoading: isMutatingTransfer }] = useTransferStockMutation();
  const [completeStockTransfer, { isLoading: isCompletingTransfer }] = useCompleteStockTransferMutation();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = allProducts?.find((p: any) => p.id === id);
    if (prod) {
      // Default to first variant
      const variants = prod.variants || [];
      if (variants.length > 0) {
        setSelectedVariantId(variants[0].id);
      } else {
        setSelectedVariantId("");
      }
      const units = getAvailableUnits(prod).map((u) => u.symbol);
      setSelectedUnit(units[0] || "");
    } else {
      setSelectedVariantId("");
      setSelectedUnit("");
    }
  };

  const handleCreateTransfer = async () => {
    if (!sourceWarehouseId || !destinationWarehouseId || !selectedProductId || !selectedVariantId || !quantity) {
      showToast({ type: "warning", title: "Peringatan", message: "Harap isi semua kolom wajib." });
      return;
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      showToast({ type: "warning", title: "Peringatan", message: "Gudang asal dan tujuan tidak boleh sama." });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast({ type: "warning", title: "Peringatan", message: "Jumlah harus positif." });
      return;
    }

    try {
      await transferStock({
        productId: selectedProductId,
        variantId: selectedVariantId,
        sourceWarehouseId,
        destinationWarehouseId,
        quantity: qtyNum,
        notes: remarks || undefined,
      }).unwrap();

      showToast({ type: "success", title: "Berhasil", message: "Transfer stok berhasil dibuat." });
      setIsModalOpen(false);
      resetForm();
      refetchTransfers();
    } catch (err: any) {
      showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal membuat transfer." });
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    const confirmed = await showConfirmation({
      title: "Terima Transfer",
      message: "Apakah Anda yakin ingin menyelesaikan dan menerima transfer stok ini?",
      confirmText: "Terima",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await completeStockTransfer(transferId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Transfer stok selesai diterima." });
        refetchTransfers();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal menerima transfer." });
      }
    }
  };

  const resetForm = () => {
    setSourceWarehouseId("");
    setDestinationWarehouseId("");
    setSelectedProductId("");
    setSelectedVariantId("");
    setSelectedUnit("");
    setQuantity("");
    setRemarks("");
  };

  const renderTransferItem = ({ item }: { item: any }) => {
    const isPending = item.status === "DRAFT";
    // Check if current user's warehouse is the destination and can complete it
    const isFulfillable = isPending && (currentUser?.role === "ADMIN" || currentUser?.warehouseId === item.destinationWarehouseId);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.transferCode}>{item.transferNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === "COMPLETED" ? "#064e3b" : "#1e1b4b" }]}>
            <Text style={[styles.statusBadgeText, { color: item.status === "COMPLETED" ? "#10b981" : "#818cf8" }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.transferPath}>
            {item.sourceWarehouse?.name} ➔ {item.destinationWarehouse?.name}
          </Text>
          <Text style={styles.cardLabel}>Daftar Item:</Text>
          {item.items?.map((it: any, index: number) => (
            <Text key={index} style={styles.transferItemText}>
              • {it.materialVariant?.name || it.materialVariant?.material?.name} ({Number(it.quantity).toLocaleString()} Unit)
            </Text>
          ))}
          {item.remarks ? <Text style={styles.remarksText}>Catatan: {item.remarks}</Text> : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardSubText}>
            Oleh: {item.requestedBy?.fullName} • {new Date(item.createdAt).toLocaleString("id-ID")}
          </Text>
        </View>

        {isFulfillable && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleCompleteTransfer(item.id)}
            disabled={isCompletingTransfer}
          >
            {isCompletingTransfer ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Terima & Selesaikan Transfer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transfer Stok</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setIsModalOpen(true)}>
          <Text style={styles.createBtnText}>+ Transfer Baru</Text>
        </TouchableOpacity>
      </View>

      {isLoadingTransfers ? (
        <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(item) => item.id}
          renderItem={renderTransferItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isFetchingTransfers} onRefresh={refetchTransfers} tintColor="#818cf8" />
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Buat Transfer Stok</Text>

                <ScrollView contentContainerStyle={{ gap: 12 }}>
                  <Text style={styles.label}>Gudang Asal *</Text>
                  <View style={styles.pickerWrapper}>
                    {warehouses?.filter(w => w.isActive).map(w => (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.pickerItem, sourceWarehouseId === w.id && styles.pickerItemActive]}
                        onPress={() => setSourceWarehouseId(w.id)}
                      >
                        <Text style={styles.pickerItemText}>{w.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Gudang Tujuan *</Text>
                  <View style={styles.pickerWrapper}>
                    {warehouses?.filter(w => w.isActive).map(w => (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.pickerItem, destinationWarehouseId === w.id && styles.pickerItemActive]}
                        onPress={() => setDestinationWarehouseId(w.id)}
                      >
                        <Text style={styles.pickerItemText}>{w.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Pilih Produk *</Text>
                  <View style={styles.pickerWrapper}>
                    {allProducts?.map((p: any) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.pickerItem, selectedProductId === p.id && styles.pickerItemActive]}
                        onPress={() => handleProductSelect(p.id)}
                      >
                        <Text style={styles.pickerItemText}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedProductId && (
                    <>
                      <Text style={styles.label}>Pilih Varian *</Text>
                      <View style={styles.pickerWrapper}>
                        {allProducts?.find((p: any) => p.id === selectedProductId)?.variants?.map((v: any) => (
                          <TouchableOpacity
                            key={v.id}
                            style={[styles.pickerItem, selectedVariantId === v.id && styles.pickerItemActive]}
                            onPress={() => setSelectedVariantId(v.id)}
                          >
                            <Text style={styles.pickerItemText}>{v.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Jumlah *</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#71717a"
                      value={quantity}
                      onChangeText={setQuantity}
                    />
                    {selectedProductId && (
                      <View style={styles.pickerItem}>
                        <Text style={styles.pickerItemText}>{selectedUnit}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.label}>Catatan</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Keterangan transfer (opsional)"
                    placeholderTextColor="#71717a"
                    value={remarks}
                    onChangeText={setRemarks}
                  />
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)}>
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleCreateTransfer}
                    disabled={isMutatingTransfer}
                  >
                    <Text style={styles.confirmBtnText}>Kirim</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
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
  createBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transferCode: {
    color: theme.primary,
    fontWeight: "bold",
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  cardBody: {
    gap: 4,
  },
  transferPath: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardLabel: {
    color: theme.textSecondary,
    fontSize: 11,
  },
  transferItemText: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  remarksText: {
    fontSize: 11,
    color: theme.textSecondary,
    backgroundColor: theme.surfaceSecondary,
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 8,
    marginTop: 4,
  },
  cardSubText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  actionBtn: {
    backgroundColor: theme.primary,
    borderRadius: 6,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  label: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: theme.textPrimary,
    marginBottom: 12,
  },
  pickerWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  pickerItem: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pickerItemActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  pickerItemText: {
    color: theme.textPrimary,
    fontSize: 11,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    height: 40,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    color: theme.textMuted,
    fontWeight: "600",
  },
  confirmBtn: {
    backgroundColor: theme.primary,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
