import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  useGetStockRequestsQuery,
  useShipStockRequestMutation,
  useReceiveStockRequestMutation,
  useAcceptStockRequestMutation,
} from "../../lib/api/inventoryApi";
import { useToast } from "../../hooks/useToast";
import { useConfirmation } from "../../hooks/useConfirmation";
import { useTheme, Theme } from "../../theme";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentUser } from "../../lib/store/features/auth/selectors";
import { ArrowLeftIcon } from "../../components/CustomIcons";

type RouteProps = RouteProp<RootStackParamList, "WarehouseRequestDetail">;

export default function WarehouseRequestDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { requestId } = route.params;
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentUser = useAppSelector(selectCurrentUser);

  // Queries (Get all and find the matching one, since there is no single-request endpoint)
  const { data: requests, isLoading, isFetching, refetch } = useGetStockRequestsQuery({ scope: "my-requests" });
  const { data: availRequests } = useGetStockRequestsQuery({ scope: "available" });
  const { data: fulfillRequests } = useGetStockRequestsQuery({ scope: "my-fulfillments" });

  const request = useMemo(() => {
    const list = [...(requests || []), ...(availRequests || []), ...(fulfillRequests || [])];
    return list.find((r) => r.id === requestId);
  }, [requests, availRequests, fulfillRequests, requestId]);

  // Mutations
  const [shipRequest, { isLoading: isShipping }] = useShipStockRequestMutation();
  const [receiveRequest, { isLoading: isReceiving }] = useReceiveStockRequestMutation();
  const [acceptRequest, { isLoading: isAccepting }] = useAcceptStockRequestMutation();

  const handleShip = async () => {
    const confirmed = await showConfirmation({
      title: "Kirim Barang",
      message: "Konfirmasi pengiriman fisik barang? Stok gudang asal akan langsung berkurang.",
      confirmText: "Kirim",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await shipRequest(requestId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Barang berhasil dikirim." });
        refetch();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal memproses." });
      }
    }
  };

  const handleReceive = async () => {
    const confirmed = await showConfirmation({
      title: "Terima Barang",
      message: "Konfirmasi fisik barang telah sampai di lokasi?",
      confirmText: "Terima",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await receiveRequest(requestId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Fisik barang diterima." });
        refetch();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal memproses." });
      }
    }
  };

  const handleAccept = async () => {
    const confirmed = await showConfirmation({
      title: "Accept Stok",
      message: "Verifikasi dan tambahkan barang ke stok sistem?",
      confirmText: "Accept",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      try {
        await acceptRequest(requestId).unwrap();
        showToast({ type: "success", title: "Berhasil", message: "Barang ditambahkan ke stok." });
        refetch();
      } catch (err: any) {
        showToast({ type: "error", title: "Gagal", message: err?.data?.message || "Gagal memproses." });
      }
    }
  };

  // Build steps array for the timeline
  const timelineSteps = useMemo(() => {
    if (!request) return [];
    
    const steps = [
      {
        title: "Diminta",
        isCompleted: true,
        time: request.createdAt,
        actor: request.requester?.fullName,
        desc: `Permintaan dibuat untuk ${request.requestingWarehouse?.name}`,
      },
      {
        title: "Diklaim",
        isCompleted: !!request.claimedAt || ["FULFILLING", "SHIPPED", "RECEIVED", "ACCEPTED"].includes(request.status),
        time: request.claimedAt,
        actor: request.sourceUser?.fullName,
        desc: request.sourceWarehouse ? `Diterima untuk dipenuhi oleh ${request.sourceWarehouse.name}` : "Menunggu klaim gudang asal",
      },
      {
        title: "Dikirim",
        isCompleted: !!request.shippedAt || ["SHIPPED", "RECEIVED", "ACCEPTED"].includes(request.status),
        time: request.shippedAt,
        actor: request.sourceUser?.fullName,
        desc: request.shippedAt ? "Fisik barang dikirim dalam perjalanan" : "Menunggu pengiriman",
      },
      {
        title: "Diterima",
        isCompleted: !!request.receivedAt || ["RECEIVED", "ACCEPTED"].includes(request.status),
        time: request.receivedAt,
        actor: request.requester?.fullName,
        desc: request.receivedAt ? "Fisik barang telah sampai di gudang tujuan" : "Menunggu kedatangan",
      },
      {
        title: "Disetujui",
        isCompleted: !!request.acceptedAt || request.status === "ACCEPTED",
        time: request.acceptedAt,
        actor: request.requester?.fullName,
        desc: request.acceptedAt ? "Barang resmi dimasukkan ke dalam stok sistem" : "Menunggu verifikasi akhir",
      },
    ];

    if (request.status === "CANCELLED") {
      steps.push({
        title: "Dibatalkan",
        isCompleted: true,
        time: request.updatedAt,
        actor: "Sistem/User",
        desc: "Permintaan telah dibatalkan",
      });
    }

    return steps;
  }, [request]);

  if (isLoading || !request) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={theme.primary} size="large" />
      </SafeAreaView>
    );
  }

  // Active transition helper flags
  const isRequester = request.requestingWarehouseId === currentUser?.warehouseId;
  const isFulfiller = request.sourceWarehouseId === currentUser?.warehouseId;
  const canShip = isFulfiller && request.status === "FULFILLING";
  const canReceive = isRequester && request.status === "SHIPPED";
  const canAccept = isRequester && request.status === "RECEIVED";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeftIcon color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Permintaan</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#818cf8" />
        }
      >
        {/* Core details */}
        <View style={styles.card}>
          <Text style={styles.requestCode}>{request.requestNumber}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gudang Peminta</Text>
            <Text style={styles.detailVal}>{request.requestingWarehouse?.name}</Text>
          </View>
          {request.sourceWarehouse && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gudang Fulfiller</Text>
              <Text style={styles.detailVal}>{request.sourceWarehouse.name}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status Saat Ini</Text>
            <Text style={[styles.statusText, { color: theme.primary }]}>{request.status}</Text>
          </View>
          {request.notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.detailLabel}>Catatan</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Item list */}
        <Text style={styles.sectionTitle}>Daftar Item</Text>
        <View style={styles.card}>
          {request.items?.map((it: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.materialVariant?.name || "Item"}</Text>
              <Text style={styles.itemQty}>
                {Number(it.quantity).toLocaleString()} Unit
              </Text>
            </View>
          ))}
        </View>

        {/* Timeline stepper */}
        <Text style={styles.sectionTitle}>Timeline Progres</Text>
        <View style={styles.card}>
          {timelineSteps.map((step, idx) => {
            const isLast = idx === timelineSteps.length - 1;
            return (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.timelineIndicators}>
                  <View style={[styles.timelineDot, step.isCompleted && styles.timelineDotActive]} />
                  {!isLast && <View style={[styles.timelineLine, step.isCompleted && styles.timelineLineActive]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.stepTitle, step.isCompleted && styles.stepTitleActive]}>
                    {step.title}
                  </Text>
                  {step.time && (
                    <Text style={styles.stepTime}>
                      {new Date(step.time).toLocaleString("id-ID")} {step.actor ? `• ${step.actor}` : ""}
                    </Text>
                  )}
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action transition button launchers */}
        {canShip && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleShip} disabled={isShipping}>
            {isShipping ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Kirim Barang (Ship)</Text>}
          </TouchableOpacity>
        )}

        {canReceive && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleReceive} disabled={isReceiving}>
            {isReceiving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Terima Fisik Barang (Receive)</Text>}
          </TouchableOpacity>
        )}

        {canAccept && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#10b981" }]} onPress={handleAccept} disabled={isAccepting}>
            {isAccepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Setujui & Simpan ke Stok (Accept)</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  requestCode: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 8,
  },
  detailLabel: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  detailVal: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  statusText: {
    fontWeight: "bold",
    fontSize: 13,
  },
  notesContainer: {
    gap: 4,
    marginTop: 4,
  },
  notesText: {
    color: theme.textPrimary,
    fontSize: 13,
    backgroundColor: theme.surfaceSecondary,
    padding: 8,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.primary,
    textTransform: "uppercase",
    marginBottom: -4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 6,
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  itemQty: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineIndicators: {
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.border,
  },
  timelineDotActive: {
    backgroundColor: theme.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.border,
    marginVertical: 4,
  },
  timelineLineActive: {
    backgroundColor: theme.primary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textMuted,
  },
  stepTitleActive: {
    color: theme.textPrimary,
  },
  stepTime: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 2,
  },
  stepDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: theme.primary,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
