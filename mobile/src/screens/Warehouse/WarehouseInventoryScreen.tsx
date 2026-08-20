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
  useGetInventoryProductsQuery,
  useGetStockMovementsQuery,
  useGetWarehousesQuery,
  useReceiveStockMutation,
  useAdjustStockMutation,
  useRemoveWasteMutation,
  useRecordOpeningStockMutation,
} from "../../lib/api/inventoryApi";
import { useGetProductsQuery } from "../../lib/api/productApi";
import { useToast } from "../../hooks/useToast";
import { useTheme, Theme } from "../../theme";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentUser } from "../../lib/store/features/auth/selectors";
import { getAvailableUnits, getDefaultUnit, formatConversionPreview } from "../../lib/utils/unitConversions";

type SubTab = "Stok" | "Riwayat" | "Aktivitas";

export default function WarehouseInventoryScreen() {
  const currentUser = useAppSelector(selectCurrentUser);
  const { showToast } = useToast();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // States
  const [activeTab, setActiveTab] = useState<SubTab>("Stok");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [stockStatus, setStockStatus] = useState<string>(""); // "", "LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"
  const [searchStock, setSearchStock] = useState("");
  const [movementType, setMovementType] = useState("");

  // Modals state
  const [modalType, setModalType] = useState<"RECEIVE" | "ADJUST" | "WASTE" | "OPENING" | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [openingItems, setOpeningItems] = useState<Array<{ materialVariantId: string; quantity: string; unit: string; remarks: string }>>([
    { materialVariantId: "", quantity: "", unit: "", remarks: "" },
  ]);

  // Queries
  const { data: warehouses, isLoading: isLoadingWh, refetch: refetchWh } = useGetWarehousesQuery();
  const { data: allProducts } = useGetProductsQuery();

  // Set default warehouse based on user role
  React.useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
      if (currentUser?.role === "WAREHOUSE" && currentUser.warehouseId) {
        setSelectedWarehouseId(currentUser.warehouseId);
      } else {
        setSelectedWarehouseId(warehouses[0].id);
      }
    }
  }, [warehouses, currentUser, selectedWarehouseId]);

  const {
    data: stockData,
    isLoading: isLoadingStock,
    isFetching: isFetchingStock,
    refetch: refetchStock,
  } = useGetInventoryProductsQuery(
    {
      warehouseId: selectedWarehouseId || undefined,
      search: searchStock || undefined,
      stockStatus: stockStatus || undefined,
    },
    { skip: !selectedWarehouseId }
  );

  const {
    data: movementData,
    isLoading: isLoadingMovements,
    isFetching: isFetchingMovements,
    refetch: refetchMovements,
  } = useGetStockMovementsQuery(
    {
      warehouseId: selectedWarehouseId || undefined,
      movementType: movementType || undefined,
    },
    { skip: !selectedWarehouseId }
  );

  // Mutations
  const [receiveStock, { isLoading: isMutatingReceive }] = useReceiveStockMutation();
  const [adjustStock, { isLoading: isMutatingAdjust }] = useAdjustStockMutation();
  const [removeWaste, { isLoading: isMutatingWaste }] = useRemoveWasteMutation();
  const [recordOpeningStock, { isLoading: isMutatingOpening }] = useRecordOpeningStockMutation();

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = allProducts?.find((p: any) => p.id === id);
    if (prod) {
      const units = getAvailableUnits(prod).map((u) => u.symbol);
      setSelectedUnit(units[0] || "");
    } else {
      setSelectedUnit("");
    }
  };

  const resolveMaterialVariantId = (productId: string) => {
    const product = allProducts?.find((p: any) => p.id === productId);
    return product?.materialVariantId ?? productId;
  };

  const handleOperationSubmit = async () => {
    if (!selectedWarehouseId) {
      showToast({ type: "error", title: "Error", message: "Gudang belum dipilih." });
      return;
    }
    if (!selectedProductId || !quantity) {
      showToast({ type: "warning", title: "Peringatan", message: "Harap isi semua kolom wajib." });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum === 0) {
      showToast({ type: "warning", title: "Peringatan", message: "Jumlah tidak valid." });
      return;
    }

    try {
      const materialVariantId = resolveMaterialVariantId(selectedProductId);
      if (modalType === "RECEIVE") {
        if (qtyNum <= 0) throw new Error("Jumlah penerimaan harus lebih dari 0");
        const selectedProduct = allProducts?.find((p: any) => p.id === selectedProductId);
        const parentId = selectedProduct?.materialId ?? selectedProductId;
        await receiveStock({
          productId: parentId,
          variantId: materialVariantId,
          warehouseId: selectedWarehouseId,
          quantity: qtyNum,
          receivedUnit: selectedUnit || undefined,
          note: remarks || undefined,
        }).unwrap();
      } else if (modalType === "ADJUST") {
        await adjustStock({
          materialVariantId,
          warehouseId: selectedWarehouseId,
          quantity: qtyNum,
          unit: selectedUnit || undefined,
          remarks,
        }).unwrap();
      } else if (modalType === "WASTE") {
        if (qtyNum <= 0) throw new Error("Jumlah waste harus lebih dari 0");
        await removeWaste({
          materialVariantId,
          warehouseId: selectedWarehouseId,
          quantity: qtyNum,
          unit: selectedUnit || undefined,
          remarks,
        }).unwrap();
      }
      showToast({ type: "success", title: "Berhasil", message: "Transaksi stok berhasil diproses." });
      setModalType(null);
      resetFormFields();
      refetchStock();
      refetchMovements();
    } catch (err: any) {
      showToast({ type: "error", title: "Gagal", message: err?.data?.message || err?.message || "Terjadi kesalahan." });
    }
  };

  const handleOpeningSubmit = async () => {
    if (!selectedWarehouseId) return;
    const validItems = openingItems.filter(item => item.materialVariantId !== "" && item.quantity !== "");
    if (validItems.length === 0) {
      showToast({ type: "warning", title: "Peringatan", message: "Harap tambahkan minimal satu produk." });
      return;
    }

    const itemsPayload = validItems.map(item => {
      const qVal = parseFloat(item.quantity);
      return {
        materialVariantId: item.materialVariantId,
        quantity: isNaN(qVal) ? 0 : qVal,
        unit: item.unit || undefined,
        remarks: item.remarks || undefined,
      };
    });

    try {
      await recordOpeningStock({ warehouseId: selectedWarehouseId, items: itemsPayload }).unwrap();
      showToast({ type: "success", title: "Berhasil", message: "Stok awal berhasil disimpan." });
      setModalType(null);
      setOpeningItems([{ materialVariantId: "", quantity: "", unit: "", remarks: "" }]);
      refetchStock();
      refetchMovements();
    } catch (err: any) {
      showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal menyimpan stok awal." });
    }
  };

  const resetFormFields = () => {
    setSelectedProductId("");
    setQuantity("");
    setSelectedUnit("");
    setRemarks("");
  };

  const handleRefresh = () => {
    refetchWh();
    refetchStock();
    refetchMovements();
  };

  const getStockStatusStyle = (stock: any) => {
    const qty = Number(stock.quantity);
    const min = Number(stock.product?.minimumStock || 0);
    if (qty <= 0) return { label: "KOSONG", color: "#ef4444", bg: "#451a03" };
    if (qty < min) return { label: "MENIPIS", color: "#f59e0b", bg: "#451a03" };
    return { label: "CUKUP", color: "#10b981", bg: "#064e3b" };
  };

  const formatMovementType = (type: string) => {
    switch (type) {
      case "OPENING": return "Stok Awal";
      case "RECEIVE": return "Penerimaan";
      case "SALE": return "Penjualan";
      case "ADJUSTMENT": return "Penyesuaian";
      case "WASTE": return "Waste";
      case "TRANSFER_OUT": return "Transfer Keluar";
      case "TRANSFER_IN": return "Transfer Masuk";
      default: return type;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manajemen Stok</Text>
        
        {/* Warehouse Selector (Only visible to non-locked WAREHOUSE users, or ADMIN) */}
        {currentUser?.role !== "WAREHOUSE" || !currentUser.warehouseId ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.whSelectorContainer}>
            {warehouses?.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.whTab, selectedWarehouseId === w.id && styles.whTabActive]}
                onPress={() => setSelectedWarehouseId(w.id)}
              >
                <Text style={[styles.whTabText, selectedWarehouseId === w.id && styles.whTabTextActive]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.whLockedText}>
            Gudang: {warehouses?.find(w => w.id === selectedWarehouseId)?.name || "Loading..."}
          </Text>
        )}
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabContainer}>
        {(["Stok", "Riwayat", "Aktivitas"] as SubTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Contents */}
      <View style={styles.content}>
        {activeTab === "Stok" && (
          <View style={{ flex: 1 }}>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.searchInput, { flex: 1, marginBottom: 0 }]}
                placeholder="Cari produk..."
                placeholderTextColor="#71717a"
                value={searchStock}
                onChangeText={setSearchStock}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {[
                  { label: "Semua", value: "" },
                  { label: "Menipis", value: "LOW_STOCK" },
                  { label: "Kosong", value: "OUT_OF_STOCK" },
                  { label: "Cukup", value: "IN_STOCK" },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.value}
                    style={[styles.statusFilterBtn, stockStatus === st.value && styles.statusFilterBtnActive]}
                    onPress={() => setStockStatus(st.value)}
                  >
                    <Text style={[styles.statusFilterText, stockStatus === st.value && styles.statusFilterTextActive]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {isLoadingStock ? (
              <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={stockData}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const statusStyle = getStockStatusStyle(item);
                  return (
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.productName}>{item.product?.name || "Produk Tidak Dikenal"}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                        </View>
                      </View>
                      <View style={styles.cardBodyRow}>
                        <View>
                          <Text style={styles.cardLabel}>Stok Aktif</Text>
                          <Text style={styles.cardValue}>
                            {Number(item.quantity).toLocaleString()} {item.product?.unit?.symbol || "PCS"}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.cardLabel}>Batas Minimum</Text>
                          <Text style={styles.cardValue}>{Number(item.product?.minimumStock || 0).toLocaleString()}</Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isFetchingStock} onRefresh={handleRefresh} tintColor="#818cf8" />
                }
              />
            )}
          </View>
        )}

        {activeTab === "Riwayat" && (
          <View style={{ flex: 1 }}>
            {isLoadingMovements ? (
              <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={movementData}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.productName}>{item.product?.name}</Text>
                      <Text style={styles.movementTypeBadge}>{formatMovementType(item.movementType)}</Text>
                    </View>
                    <View style={styles.cardBodyRow}>
                      <View>
                        <Text style={styles.cardLabel}>Mutasi</Text>
                        <Text style={[styles.cardValue, { color: Number(item.quantity) >= 0 ? "#10b981" : "#ef4444" }]}>
                          {Number(item.quantity) >= 0 ? "+" : ""}{Number(item.quantity).toLocaleString()}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.cardLabel}>Saldo Akhir</Text>
                        <Text style={styles.cardValue}>{Number(item.quantityAfter).toLocaleString()}</Text>
                      </View>
                    </View>
                    {item.remarks ? <Text style={styles.remarksText}>Catatan: {item.remarks}</Text> : null}
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardSubText}>
                        Oleh: {item.createdBy?.fullName || "Sistem"} • {new Date(item.createdAt).toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isFetchingMovements} onRefresh={handleRefresh} tintColor="#818cf8" />
                }
              />
            )}
          </View>
        )}

        {activeTab === "Aktivitas" && (
          <ScrollView contentContainerStyle={styles.activityContainer}>
            <Text style={styles.sectionTitle}>Operasi Gudang</Text>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("RECEIVE")}>
              <Text style={styles.activityBtnText}>+ Terima Stok (Barang Masuk)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("ADJUST")}>
              <Text style={styles.activityBtnText}>+ Penyesuaian Stok (Koreksi)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("WASTE")}>
              <Text style={styles.activityBtnText}>+ Pencatatan Waste</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("OPENING")}>
              <Text style={styles.activityBtnText}>+ Stok Awal</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Modals */}
      <Modal
        visible={modalType !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalType(null)}
      >
        <TouchableWithoutFeedback onPress={() => setModalType(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {modalType === "RECEIVE" && "Terima Stok"}
                  {modalType === "ADJUST" && "Penyesuaian Stok"}
                  {modalType === "WASTE" && "Pencatatan Waste"}
                  {modalType === "OPENING" && "Stok Awal"}
                </Text>

                <ScrollView contentContainerStyle={{ gap: 12 }}>
                  {modalType !== "OPENING" ? (
                    <>
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

                      <Text style={styles.label}>Jumlah & Satuan *</Text>
                      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                        <TextInput
                          style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#71717a"
                          value={quantity}
                          onChangeText={setQuantity}
                        />
                        {selectedProductId && (
                          <View style={{ flexDirection: "row", gap: 4 }}>
                            {getAvailableUnits(allProducts?.find((p: any) => p.id === selectedProductId)).map((u) => (
                              <TouchableOpacity
                                key={u.symbol}
                                style={[
                                  styles.pickerItem,
                                  { justifyContent: "center", alignItems: "center", height: 40, minWidth: 40 },
                                  selectedUnit === u.symbol && styles.pickerItemActive,
                                ]}
                                onPress={() => setSelectedUnit(u.symbol)}
                              >
                                <Text style={styles.pickerItemText}>{u.symbol}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {(() => {
                        const selectedProduct = allProducts?.find((p: any) => p.id === selectedProductId);
                        const qtyNum = parseFloat(quantity);
                        if (selectedProduct && !isNaN(qtyNum) && qtyNum > 0 && selectedUnit) {
                          const preview = formatConversionPreview(selectedProduct, qtyNum, selectedUnit);
                          if (preview) {
                            return (
                              <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "bold", marginTop: -6, marginBottom: 8 }}>
                                {preview}
                              </Text>
                            );
                          }
                        }
                        return null;
                      })()}

                      <Text style={styles.label}>Catatan / Keterangan</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Keterangan transaksi"
                        placeholderTextColor="#71717a"
                        value={remarks}
                        onChangeText={setRemarks}
                      />
                    </>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {openingItems.map((item, idx) => (
                        <View key={idx} style={{ borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 8, gap: 8 }}>
                          <Text style={styles.label}>Pilih Produk *</Text>
                          <View style={styles.pickerWrapper}>
                            {allProducts?.map((p: any) => (
                              <TouchableOpacity
                                key={p.id}
                                style={[styles.pickerItem, item.materialVariantId === (p.materialVariantId ?? p.id) && styles.pickerItemActive]}
                                onPress={() => {
                                  const next = [...openingItems];
                                  next[idx].materialVariantId = p.materialVariantId ?? p.id;
                                  next[idx].unit = getDefaultUnit(p) || "";
                                  setOpeningItems(next);
                                }}
                              >
                                <Text style={styles.pickerItemText}>{p.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TextInput
                              style={[styles.modalInput, { flex: 1 }]}
                              keyboardType="numeric"
                              placeholder="Jumlah Stok Awal"
                              placeholderTextColor="#71717a"
                              value={item.quantity}
                              onChangeText={(txt) => {
                                const next = [...openingItems];
                                next[idx].quantity = txt;
                                setOpeningItems(next);
                              }}
                            />
                            <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                              {getAvailableUnits(allProducts?.find((p: any) => (p.materialVariantId ?? p.id) === item.materialVariantId)).map((u) => (
                                <TouchableOpacity
                                  key={u.symbol}
                                  style={[
                                    styles.pickerItem,
                                    { justifyContent: "center", alignItems: "center", height: 40, minWidth: 40 },
                                    item.unit === u.symbol && styles.pickerItemActive,
                                  ]}
                                  onPress={() => {
                                    const next = [...openingItems];
                                    next[idx].unit = u.symbol;
                                    setOpeningItems(next);
                                  }}
                                >
                                  <Text style={styles.pickerItemText}>{u.symbol}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                          <TextInput
                            style={styles.modalInput}
                            placeholder="Catatan"
                            placeholderTextColor="#71717a"
                            value={item.remarks}
                            onChangeText={(txt) => {
                              const next = [...openingItems];
                              next[idx].remarks = txt;
                              setOpeningItems(next);
                            }}
                          />
                          <TouchableOpacity
                            style={{ alignSelf: "flex-end", marginTop: 4 }}
                            onPress={() => {
                              setOpeningItems(openingItems.filter((_, i) => i !== idx));
                            }}
                          >
                            <Text style={{ color: theme.error }}>Hapus</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => setOpeningItems([...openingItems, { materialVariantId: "", quantity: "", unit: "", remarks: "" }])}
                      >
                        <Text style={styles.secondaryBtnText}>+ Tambah Baris</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalType(null)}>
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => {
                      if (modalType === "OPENING") handleOpeningSubmit();
                      else handleOperationSubmit();
                    }}
                    disabled={isMutatingReceive || isMutatingAdjust || isMutatingWaste || isMutatingOpening}
                  >
                    <Text style={styles.confirmBtnText}>Simpan</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  whSelectorContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  whTab: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  whTabActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  whTabText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: "600",
  },
  whTabTextActive: {
    color: theme.primary,
  },
  whLockedText: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textSecondary,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  tabButtonText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: theme.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterRow: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: theme.textPrimary,
  },
  statusFilterBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusFilterBtnActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  statusFilterText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: "600",
  },
  statusFilterTextActive: {
    color: theme.primary,
  },
  listContent: {
    paddingBottom: 24,
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
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.textPrimary,
    flex: 1,
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
  cardBodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  cardLabel: {
    color: theme.textSecondary,
    fontSize: 11,
  },
  cardValue: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "bold",
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
  movementTypeBadge: {
    backgroundColor: theme.surfaceSecondary,
    color: theme.textSecondary,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "bold",
  },
  remarksText: {
    fontSize: 11,
    color: theme.textSecondary,
    backgroundColor: theme.surfaceSecondary,
    padding: 6,
    borderRadius: 4,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  activityContainer: {
    gap: 12,
  },
  sectionTitle: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  activityBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  activityBtnText: {
    color: theme.textPrimary,
    fontWeight: "bold",
    fontSize: 14,
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
