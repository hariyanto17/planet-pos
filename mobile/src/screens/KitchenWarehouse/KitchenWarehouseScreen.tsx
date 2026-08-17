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
  Alert,
  RefreshControl,
  TouchableWithoutFeedback,
} from "react-native";
import {
  useGetInventoryProductsQuery,
  useGetStockMovementsQuery,
  useGetStockTransfersQuery,
  useGetWarehousesQuery,
  useReceiveStockMutation,
  useAdjustStockMutation,
  useRemoveWasteMutation,
  useRecordOpeningStockMutation,
  useTransferStockMutation,
  useCompleteStockTransferMutation,
  useGetStockRequestsQuery,
  useCreateStockRequestMutation,
  useClaimStockRequestMutation,
  useShipStockRequestMutation,
  useReceiveStockRequestMutation,
  useAcceptStockRequestMutation,
  useCancelStockRequestMutation,
} from "../../lib/api/inventoryApi";
import { useGetProductsQuery } from "../../lib/api/productApi";
import { useToast } from "../../hooks/useToast";
import { useConfirmation } from "../../hooks/useConfirmation";
import { useTheme, Theme } from "../../theme";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentUser } from "../../lib/store/features/auth/selectors";
import { getAvailableUnits, getDefaultUnit, formatConversionPreview } from "../../lib/utils/unitConversions";

type TabType = "Stok" | "Riwayat" | "Transfer" | "Aktivitas" | "Permintaan";

export default function KitchenWarehouseScreen() {
  const currentUser = useAppSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState<TabType>("Stok");
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Queries
  const { data: warehouses, isLoading: isLoadingWh } = useGetWarehousesQuery();
  const { data: allProducts } = useGetProductsQuery();

  // Find Kitchen Storage
  const kitchenStorage = warehouses?.find(
    (w) => w.warehouseType === "KITCHEN_STORAGE" && w.isDefaultKitchenStorage
  );
  const kitchenWarehouseId = kitchenStorage?.id;

  // Tab 1: Stok Query
  const [searchStock, setSearchStock] = useState("");
  const {
    data: stockData,
    isLoading: isLoadingStock,
    isFetching: isFetchingStock,
    refetch: refetchStock,
  } = useGetInventoryProductsQuery(
    { warehouseId: kitchenWarehouseId, search: searchStock },
    { skip: !kitchenWarehouseId }
  );

  // Tab 2: Riwayat Query
  const {
    data: movementData,
    isLoading: isLoadingMovements,
    isFetching: isFetchingMovements,
    refetch: refetchMovements,
  } = useGetStockMovementsQuery(
    { warehouseId: kitchenWarehouseId },
    { skip: !kitchenWarehouseId }
  );

  // Tab 3: Transfer Query
  const {
    data: transfersData,
    isLoading: isLoadingTransfers,
    isFetching: isFetchingTransfers,
    refetch: refetchTransfers,
  } = useGetStockTransfersQuery();

  // Filter transfers intended for Kitchen Storage
  const kitchenTransfers = transfersData?.filter(
    (t) => t.destinationWarehouseId === kitchenWarehouseId
  ) || [];

  // Tab 5: Requests Query
  const [activeRequestScope, setActiveRequestScope] = useState<"my-requests" | "available" | "my-fulfillments" | "incoming" | "completed">("my-requests");
  const {
    data: requestsData,
    isLoading: isLoadingRequests,
    isFetching: isFetchingRequests,
    refetch: refetchRequests,
  } = useGetStockRequestsQuery({ scope: activeRequestScope });

  // Mutations
  const [receiveStock, { isLoading: isMutatingReceive }] = useReceiveStockMutation();
  const [adjustStock, { isLoading: isMutatingAdjust }] = useAdjustStockMutation();
  const [removeWaste, { isLoading: isMutatingWaste }] = useRemoveWasteMutation();
  const [recordOpeningStock, { isLoading: isMutatingOpening }] = useRecordOpeningStockMutation();
  const [transferStock, { isLoading: isMutatingTransfer }] = useTransferStockMutation();
  const [completeStockTransfer, { isLoading: isCompletingTransfer }] = useCompleteStockTransferMutation();
  const [createStockRequest, { isLoading: isMutatingCreateRequest }] = useCreateStockRequestMutation();
  const [claimStockRequest, { isLoading: isMutatingClaim }] = useClaimStockRequestMutation();
  const [shipStockRequest, { isLoading: isMutatingShip }] = useShipStockRequestMutation();
  const [receiveStockRequest, { isLoading: isMutatingReceiveReq }] = useReceiveStockRequestMutation();
  const [acceptStockRequest, { isLoading: isMutatingAccept }] = useAcceptStockRequestMutation();
  const [cancelStockRequest, { isLoading: isMutatingCancel }] = useCancelStockRequestMutation();

  // Modals state
  const [modalType, setModalType] = useState<"RECEIVE" | "ADJUST" | "WASTE" | "OPENING" | "TRANSFER" | "REQUEST" | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [openingItems, setOpeningItems] = useState<Array<{ materialVariantId: string; quantity: string; unit: string; remarks: string }>>([
    { materialVariantId: "", quantity: "", unit: "", remarks: "" },
  ]);

  const resolveMaterialVariantId = (productId: string) => {
    const product = allProducts?.find((p: any) => p.id === productId);
    return product?.materialVariantId ?? productId;
  };

  const getCompatibleUnits = (baseUnit?: string) => {
    if (baseUnit === "G") return ["g", "kg"];
    if (baseUnit === "ML") return ["ml", "L"];
    return ["pcs"];
  };

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

  const handleCompleteTransfer = async (transferId: string) => {
    const confirmed = await showConfirmation({
      title: "Terima Transfer",
      message: "Apakah Anda yakin ingin menerima transfer stok ini?",
      confirmText: "Terima",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await completeStockTransfer(transferId).unwrap();
        showToast({
          type: "success",
          title: "Berhasil",
          message: "Transfer stok berhasil diselesaikan.",
        });
        refetchTransfers();
        refetchStock();
      } catch (err: any) {
        showToast({
          type: "error",
          title: "Gagal",
          message: err?.data?.message || "Terjadi kesalahan.",
        });
      }
    }
  };

  const handleOperationSubmit = async () => {
    if (!kitchenWarehouseId) {
      showToast({ type: "error", title: "Error", message: "Gudang dapur tidak terdeteksi." });
      return;
    }
    if (!selectedProductId || !quantity) {
      showToast({ type: "warning", title: "Peringatan", message: "Harap isi semua kolom wajib." });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast({ type: "warning", title: "Peringatan", message: "Jumlah harus berupa angka positif." });
      return;
    }

    try {
      const materialVariantId = resolveMaterialVariantId(selectedProductId);
      if (modalType === "RECEIVE") {
        const selectedProduct = allProducts?.find((product: any) => (product.materialVariantId ?? product.id) === materialVariantId);
        const productId = selectedProduct?.materialId;
        if (!productId) {
          throw new Error("Produk induk untuk varian stok tidak ditemukan.");
        }
        await receiveStock({ productId, variantId: materialVariantId, warehouseId: kitchenWarehouseId, quantity: qtyNum, receivedUnit: selectedProduct?.name, note: remarks || undefined }).unwrap();
      } else if (modalType === "ADJUST") {
        await adjustStock({ materialVariantId, warehouseId: kitchenWarehouseId, quantity: qtyNum, unit: selectedUnit || undefined, remarks }).unwrap();
      } else if (modalType === "WASTE") {
        await removeWaste({ materialVariantId, warehouseId: kitchenWarehouseId, quantity: qtyNum, unit: selectedUnit || undefined, remarks }).unwrap();
      }
      showToast({ type: "success", title: "Berhasil", message: "Operasi stok berhasil disimpan." });
      setModalType(null);
      resetFormFields();
      refetchStock();
      refetchMovements();
    } catch (err: any) {
      showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal memproses operasi." });
    }
  };

  const handleOpeningSubmit = async () => {
    if (!kitchenWarehouseId) return;
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
      await recordOpeningStock({ warehouseId: kitchenWarehouseId, items: itemsPayload }).unwrap();
      showToast({ type: "success", title: "Berhasil", message: "Stok awal berhasil disimpan." });
      setModalType(null);
      setOpeningItems([{ materialVariantId: "", quantity: "", unit: "", remarks: "" }]);
      refetchStock();
      refetchMovements();
    } catch (err: any) {
      showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal menyimpan stok awal." });
    }
  };

  const handleTransferSubmit = async () => {
    if (!kitchenWarehouseId) return;
    if (!sourceWarehouseId || !selectedProductId || !quantity) {
      showToast({ type: "warning", title: "Peringatan", message: "Harap isi semua kolom wajib." });
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast({ type: "warning", title: "Peringatan", message: "Jumlah harus positif." });
      return;
    }

    try {
      const materialVariantId = resolveMaterialVariantId(selectedProductId);
      await transferStock({
        sourceWarehouseId,
        destinationWarehouseId: kitchenWarehouseId,
        items: [{ materialVariantId, quantity: qtyNum, unit: selectedUnit || undefined }],
        remarks,
      }).unwrap();
      showToast({ type: "success", title: "Berhasil", message: "Permintaan transfer berhasil dibuat." });
      setModalType(null);
      resetFormFields();
      refetchTransfers();
    } catch (err: any) {
      showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal membuat transfer." });
    }
  };

  const handleRequestSubmit = async () => {
    if (!kitchenWarehouseId) {
      showToast({ type: "error", title: "Error", message: "Gudang peminta tidak terdeteksi." });
      return;
    }
    if (!selectedProductId || !quantity) {
      showToast({ type: "warning", title: "Peringatan", message: "Harap isi semua kolom wajib." });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast({ type: "warning", title: "Peringatan", message: "Jumlah harus berupa angka positif." });
      return;
    }

    try {
      const materialVariantId = resolveMaterialVariantId(selectedProductId);
      await createStockRequest({
        requestingWarehouseId: kitchenWarehouseId,
        items: [
          {
            materialVariantId,
            quantity: qtyNum,
            unit: selectedUnit || undefined,
          },
        ],
        notes: remarks || undefined,
      }).unwrap();

      showToast({
        type: "success",
        title: "Berhasil",
        message: "Permintaan stok berhasil diajukan.",
      });
      setModalType(null);
      resetFormFields();
      refetchRequests();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Gagal",
        message: err?.data?.message || "Gagal mengajukan permintaan.",
      });
    }
  };

  const handleClaimRequest = async (requestId: string) => {
    if (!kitchenWarehouseId) return;
    const confirmed = await showConfirmation({
      title: "Claim Permintaan",
      message: "Apakah Anda yakin ingin memproses permintaan stok ini dari gudang Anda?",
      confirmText: "Claim",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await claimStockRequest({ id: requestId, sourceWarehouseId: kitchenWarehouseId }).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Permintaan berhasil diklaim." });
        refetchRequests();
        refetchStock();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal mengklaim." });
      }
    }
  };

  const handleShipRequest = async (requestId: string) => {
    const confirmed = await showConfirmation({
      title: "Kirim Barang",
      message: "Konfirmasi pengiriman fisik barang? Stok gudang asal akan langsung berkurang.",
      confirmText: "Kirim",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await shipStockRequest(requestId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Barang berhasil dikirim." });
        refetchRequests();
        refetchStock();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal mengirim." });
      }
    }
  };

  const handleReceiveRequest = async (requestId: string) => {
    const confirmed = await showConfirmation({
      title: "Terima Barang",
      message: "Konfirmasi barang telah sampai di lokasi secara fisik?",
      confirmText: "Terima",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await receiveStockRequest(requestId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Fisik barang diterima." });
        refetchRequests();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal menerima." });
      }
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const confirmed = await showConfirmation({
      title: "Accept Stok",
      message: "Verifikasi dan tambahkan barang ke stok sistem?",
      confirmText: "Accept",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await acceptStockRequest(requestId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Barang ditambahkan ke stok." });
        refetchRequests();
        refetchStock();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal memproses." });
      }
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const confirmed = await showConfirmation({
      title: "Batalkan Permintaan",
      message: "Apakah Anda yakin ingin membatalkan permintaan ini?",
      confirmText: "Batalkan",
      cancelText: "Kembali",
      variant: "danger",
    });

    if (confirmed) {
      try {
        await cancelStockRequest(requestId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Permintaan dibatalkan." });
        refetchRequests();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal membatalkan." });
      }
    }
  };

  const resetFormFields = () => {
    setSelectedProductId("");
    setQuantity("");
    setSelectedUnit("");
    setRemarks("");
    setSourceWarehouseId("");
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

  const renderStockItem = ({ item }: { item: any }) => {
    const status = getStockStatusStyle(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.productName}>{item.product?.name || "Produk Tidak Dikenal"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardLabel}>Jumlah Stok</Text>
          <Text style={styles.cardValue}>
            {Number(item.quantity).toLocaleString()} {item.product?.unit?.symbol || "PCS"}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardSubText}>Min. Stok: {Number(item.product?.minimumStock || 0).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderMovementItem = ({ item }: { item: any }) => {
    return (
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
    );
  };

  const renderTransferItem = ({ item }: { item: any }) => {
    const isPending = item.status === "DRAFT";
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.transferCode}>{item.code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? "#3b82f620" : "#10b98120" }]}>
            <Text style={[styles.statusBadgeText, { color: isPending ? "#3b82f6" : "#10b981" }]}>
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
              • {it.product?.name} ({Number(it.quantity).toLocaleString()} {it.product?.unit?.symbol || "PCS"})
            </Text>
          ))}
        </View>
        {isPending ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleCompleteTransfer(item.id)}
            disabled={isCompletingTransfer}
          >
            {isCompletingTransfer ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Terima Transfer</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gudang Dapur</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(["Stok", "Riwayat", "Transfer", "Aktivitas"] as TabType[]).map((tab) => (
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

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "Stok" && (
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari produk..."
              placeholderTextColor="#71717a"
              value={searchStock}
              onChangeText={setSearchStock}
            />
            {isLoadingStock ? (
              <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={stockData}
                keyExtractor={(item) => item.id}
                renderItem={renderStockItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isFetchingStock} onRefresh={refetchStock} tintColor="#818cf8" />
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
                renderItem={renderMovementItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isFetchingMovements} onRefresh={refetchMovements} tintColor="#818cf8" />
                }
              />
            )}
          </View>
        )}

        {activeTab === "Transfer" && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setModalType("TRANSFER")}>
              <Text style={styles.primaryBtnText}>+ Buat Transfer</Text>
            </TouchableOpacity>
            {isLoadingTransfers ? (
              <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={kitchenTransfers}
                keyExtractor={(item) => item.id}
                renderItem={renderTransferItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isFetchingTransfers} onRefresh={refetchTransfers} tintColor="#818cf8" />
                }
              />
            )}
          </View>
        )}

        {activeTab === "Aktivitas" && (
          <ScrollView contentContainerStyle={styles.activityContainer}>
            <Text style={styles.sectionTitle}>Operasi Mandiri (Target: Kitchen Storage)</Text>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("RECEIVE")}>
              <Text style={styles.activityBtnText}>+ Terima Stok</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("ADJUST")}>
              <Text style={styles.activityBtnText}>+ Penyesuaian Stok</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("WASTE")}>
              <Text style={styles.activityBtnText}>+ Waste</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityBtn} onPress={() => setModalType("OPENING")}>
              <Text style={styles.activityBtnText}>+ Stok Awal</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Modals for Stock Operations */}
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
                  {modalType === "TRANSFER" && "Buat Permintaan Transfer"}
                </Text>

                <ScrollView contentContainerStyle={{ gap: 12 }}>
                  {modalType === "TRANSFER" && (
                    <View>
                      <Text style={styles.label}>Gudang Asal *</Text>
                      <View style={styles.pickerWrapper}>
                        {warehouses?.filter(w => w.id !== kitchenWarehouseId && w.isActive).map(w => (
                          <TouchableOpacity
                            key={w.id}
                            style={[styles.pickerItem, sourceWarehouseId === w.id && styles.pickerItemActive]}
                            onPress={() => setSourceWarehouseId(w.id)}
                          >
                            <Text style={styles.pickerItemText}>{w.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

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
                          {(() => {
                            const selectedProduct = allProducts?.find((p: any) => (p.materialVariantId ?? p.id) === item.materialVariantId);
                            const qtyNum = parseFloat(item.quantity);
                            const preview = formatConversionPreview(selectedProduct, !isNaN(qtyNum) ? qtyNum : NaN, item.unit);
                            if (preview) {
                              return (
                                <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "bold", marginTop: -6, marginBottom: 8 }}>
                                  {preview}
                                </Text>
                              );
                            }
                            return null;
                          })()}
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
                      else if (modalType === "TRANSFER") handleTransferSubmit();
                      else handleOperationSubmit();
                    }}
                    disabled={
                      isMutatingReceive ||
                      isMutatingAdjust ||
                      isMutatingWaste ||
                      isMutatingOpening ||
                      isMutatingTransfer
                    }
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
    paddingHorizontal: 20,
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
  searchInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: theme.textPrimary,
    marginBottom: 12,
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
  cardBody: {
    gap: 4,
  },
  cardBodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  transferCode: {
    color: theme.primary,
    fontWeight: "bold",
    fontSize: 13,
  },
  transferPath: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  transferItemText: {
    color: theme.textSecondary,
    fontSize: 12,
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
  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
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
  openingItemRow: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
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
