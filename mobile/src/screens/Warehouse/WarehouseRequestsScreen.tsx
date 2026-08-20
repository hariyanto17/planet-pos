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
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  useGetStockRequestsQuery,
  useGetWarehousesQuery,
  useCreateStockRequestMutation,
  useClaimStockRequestMutation,
  useCancelStockRequestMutation,
} from "../../lib/api/inventoryApi";
import { useGetProductsQuery } from "../../lib/api/productApi";
import { useToast } from "../../hooks/useToast";
import { useConfirmation } from "../../hooks/useConfirmation";
import { useTheme, Theme } from "../../theme";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentUser } from "../../lib/store/features/auth/selectors";

type RequestScope = "my-requests" | "available" | "my-fulfillments";

export default function WarehouseRequestsScreen() {
  const currentUser = useAppSelector(selectCurrentUser);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // States
  const [activeScope, setActiveScope] = useState<RequestScope>("my-requests");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Queries
  const {
    data: requests,
    isLoading: isLoadingReq,
    isFetching: isFetchingReq,
    refetch: refetchRequests,
  } = useGetStockRequestsQuery({ scope: activeScope });

  const { data: warehouses } = useGetWarehousesQuery();
  const { data: allProducts } = useGetProductsQuery();

  // Mutations
  const [createStockRequest, { isLoading: isCreating }] = useCreateStockRequestMutation();
  const [claimStockRequest, { isLoading: isClaiming }] = useClaimStockRequestMutation();
  const [cancelStockRequest, { isLoading: isCancelling }] = useCancelStockRequestMutation();

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = allProducts?.find((p: any) => p.id === id);
    if (prod && prod.variants?.length > 0) {
      setSelectedVariantId(prod.variants[0].id);
    } else {
      setSelectedVariantId("");
    }
  };

  const handleCreateRequest = async () => {
    const userWhId = currentUser?.warehouseId;
    if (!userWhId) {
      showToast({ type: "error", title: "Error", message: "Anda tidak ditugaskan ke gudang manapun." });
      return;
    }
    if (!selectedProductId || !selectedVariantId || !quantity) {
      showToast({ type: "warning", title: "Peringatan", message: "Harap isi semua kolom wajib." });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast({ type: "warning", title: "Peringatan", message: "Jumlah harus positif." });
      return;
    }

    try {
      await createStockRequest({
        requestingWarehouseId: userWhId,
        items: [
          {
            productId: selectedProductId,
            variantId: selectedVariantId,
            quantity: qtyNum,
          },
        ],
        notes: notes || undefined,
      }).unwrap();

      showToast({ type: "success", title: "Berhasil", message: "Permintaan stok berhasil diajukan." });
      setIsModalOpen(false);
      resetForm();
      refetchRequests();
    } catch (err: any) {
      showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal membuat permintaan." });
    }
  };

  const handleClaim = async (requestId: string) => {
    const userWhId = currentUser?.warehouseId;
    if (!userWhId) {
      showToast({ type: "error", title: "Error", message: "Anda tidak ditugaskan ke gudang manapun." });
      return;
    }

    const confirmed = await showConfirmation({
      title: "Claim Permintaan",
      message: "Apakah Anda yakin ingin memproses permintaan stok ini dari gudang Anda?",
      confirmText: "Klaim",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await claimStockRequest({ id: requestId, sourceWarehouseId: userWhId }).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Permintaan berhasil diklaim." });
        refetchRequests();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal mengklaim." });
      }
    }
  };

  const handleCancel = async (requestId: string) => {
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

  const resetForm = () => {
    setSelectedProductId("");
    setSelectedVariantId("");
    setQuantity("");
    setNotes("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return { color: "#f59e0b", bg: "#451a03" };
      case "FULFILLING": return { color: "#3b82f6", bg: "#1e1b4b" };
      case "SHIPPED": return { color: "#a855f7", bg: "#3b0764" };
      case "RECEIVED": return { color: "#10b981", bg: "#064e3b" };
      case "ACCEPTED": return { color: "#10b981", bg: "#064e3b" };
      case "CANCELLED": return { color: "#ef4444", bg: "#450a0a" };
      default: return { color: theme.textSecondary, bg: theme.surfaceSecondary };
    }
  };

  const renderRequestItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusColor(item.status);
    const isPending = item.status === "PENDING";
    const canClaim = isPending && activeScope === "available" && currentUser?.warehouseId !== item.requestingWarehouseId;
    const canCancel = (isPending || item.status === "FULFILLING") && item.requestingWarehouseId === currentUser?.warehouseId;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("WarehouseRequestDetail", { requestId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.requestCode}>{item.requestNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.whLabel}>
            Peminta: <Text style={{ color: theme.textPrimary, fontWeight: "bold" }}>{item.requestingWarehouse?.name}</Text>
          </Text>
          {item.sourceWarehouse && (
            <Text style={styles.whLabel}>
              Fulfiller: <Text style={{ color: theme.textPrimary }}>{item.sourceWarehouse?.name}</Text>
            </Text>
          )}

          <Text style={[styles.cardLabel, { marginTop: 6 }]}>Daftar Permintaan:</Text>
          {item.items?.map((it: any, index: number) => (
            <Text key={index} style={styles.requestItemText}>
              • {it.materialVariant?.name || it.materialVariant?.material?.name} ({Number(it.quantity).toLocaleString()} Unit)
            </Text>
          ))}
          {item.notes ? <Text style={styles.notesText}>Catatan: {item.notes}</Text> : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardSubText}>
            Oleh: {item.requester?.fullName} • {new Date(item.createdAt).toLocaleString("id-ID")}
          </Text>
        </View>

        {canClaim && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleClaim(item.id)}
            disabled={isClaiming}
          >
            {isClaiming ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Klaim & Penuhi Permintaan</Text>
            )}
          </TouchableOpacity>
        )}

        {canCancel && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.error }]}
            onPress={() => handleCancel(item.id)}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Batalkan Permintaan</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Permintaan Stok</Text>
        {currentUser?.warehouseId && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setIsModalOpen(true)}>
            <Text style={styles.createBtnText}>+ Request Baru</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Scope Navigation */}
      <View style={styles.scopeContainer}>
        {[
          { key: "my-requests", label: "Request Saya" },
          { key: "available", label: "Tersedia" },
          { key: "my-fulfillments", label: "Fulfillment Saya" },
        ].map((sc) => (
          <TouchableOpacity
            key={sc.key}
            style={[styles.scopeBtn, activeScope === sc.key && styles.scopeBtnActive]}
            onPress={() => setActiveScope(sc.key as RequestScope)}
          >
            <Text style={[styles.scopeBtnText, activeScope === sc.key && styles.scopeBtnTextActive]}>
              {sc.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoadingReq ? (
        <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isFetchingReq} onRefresh={refetchRequests} tintColor="#818cf8" />
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
                <Text style={styles.modalTitle}>Buat Permintaan Stok</Text>

                <ScrollView contentContainerStyle={{ gap: 12 }}>
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

                  <Text style={styles.label}>Jumlah Permintaan *</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#71717a"
                    value={quantity}
                    onChangeText={setQuantity}
                  />

                  <Text style={styles.label}>Catatan Tambahan</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Catatan / keterangan (opsional)"
                    placeholderTextColor="#71717a"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)}>
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleCreateRequest}
                    disabled={isCreating}
                  >
                    <Text style={styles.confirmBtnText}>Ajukan</Text>
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
  scopeContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  scopeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  scopeBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  scopeBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
  },
  scopeBtnTextActive: {
    color: theme.primary,
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
  requestCode: {
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
  whLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  cardLabel: {
    color: theme.textSecondary,
    fontSize: 11,
  },
  requestItemText: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  notesText: {
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
