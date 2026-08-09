import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import PrinterService, { BluetoothDevice } from "../services/PrinterService";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";
import { useTheme, Theme } from "../theme";
import { ArrowLeftIcon } from "../components/CustomIcons";

type Props = StackScreenProps<RootStackParamList, "PrinterSettings">;

export default function PrinterSettingsScreen({ navigation }: Props) {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  
  const styles = useMemo(() => createStyles(theme), [theme]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const list = await PrinterService.getPairedDevices();
      setDevices(list);
    } catch (error) {
      showToast({
        type: "error",
        title: "Kesalahan Bluetooth",
        message: "Gagal mengambil daftar perangkat terpasang.",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    const connected = await PrinterService.isConnected();
    if (!connected) {
      setConnectedDeviceName(null);
    }
  };

  useEffect(() => {
    fetchDevices();
    checkConnection();
  }, []);

  const handleConnect = async (device: BluetoothDevice) => {
    setLoading(true);
    try {
      const success = await PrinterService.connect(device);
      if (success) {
        setConnectedDeviceName(device.name);
        showToast({
          type: "success",
          title: "Printer Terhubung",
          message: `Berhasil terhubung ke ${device.name}`,
        });
      } else {
        showToast({
          type: "error",
          title: "Koneksi Gagal",
          message: `Tidak dapat terhubung ke ${device.name}`,
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Kesalahan Koneksi",
        message: "Terjadi kesalahan saat menyambungkan.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = await showConfirmation({
      title: "Putuskan Printer",
      message: "Apakah Anda yakin ingin memutuskan sambungan printer?",
      confirmText: "Putuskan",
      cancelText: "Batal",
      variant: "warning",
    });

    if (confirmed) {
      await PrinterService.disconnect();
      setConnectedDeviceName(null);
      showToast({
        type: "info",
        title: "Terputus",
        message: "Printer terputus.",
      });
    }
  };

  const handleTestPrint = async () => {
    setLoading(true);
    try {
      await PrinterService.printTestPage();
      showToast({
        type: "success",
        title: "Sukses Cetak",
        message: "Halaman uji coba berhasil dicetak.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Kesalahan Cetak",
        message: error?.message || "Gagal mencetak halaman uji coba.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ArrowLeftIcon color={theme.textPrimary} />
            <Text style={styles.backText}>Kembali</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Printer Bluetooth</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Status Koneksi</Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Status Printer:</Text>
          <Text style={[styles.statusValue, connectedDeviceName ? styles.connected : styles.disconnected]}>
            {connectedDeviceName ? `Terhubung ke ${connectedDeviceName}` : "Terputus"}
          </Text>
        </View>

        {connectedDeviceName ? (
          <View style={styles.actionsBox}>
            <TouchableOpacity 
              style={[styles.primaryBtn, loading && styles.disabledBtn]} 
              onPress={handleTestPrint}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Memproses..." : "Cetak Uji Coba"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dangerBtn, loading && styles.disabledBtn]} 
              onPress={handleDisconnect}
              disabled={loading}
            >
              <Text style={styles.dangerBtnText}>Putuskan Koneksi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pairContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Perangkat Tersedia</Text>
              <TouchableOpacity onPress={fetchDevices} disabled={loading}>
                <Text style={styles.refreshBtnText}>
                  {loading ? "Menyegarkan..." : "🔄 Segarkan"}
                </Text>
              </TouchableOpacity>
            </View>

            {loading && devices.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.loadingText}>Mencari perangkat...</Text>
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.address}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.deviceRow}
                    onPress={() => handleConnect(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{item.name}</Text>
                      <Text style={styles.deviceAddress}>{item.address}</Text>
                    </View>
                    <Text style={styles.connectLabel}>Sambung ➔</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Tidak ditemukan perangkat bluetooth yang terpasang.</Text>
                }
              />
            )}
          </View>
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
    backgroundColor: theme.surface,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusBox: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  connected: {
    color: theme.success,
  },
  disconnected: {
    color: theme.error,
  },
  actionsBox: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: theme.primary,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  dangerBtn: {
    borderWidth: 1,
    borderColor: theme.error,
    backgroundColor: theme.error + "15",
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: {
    color: theme.error,
    fontWeight: "bold",
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  pairContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  listTitle: {
    color: theme.textPrimary,
    fontWeight: "600",
  },
  refreshBtnText: {
    color: theme.primary,
    fontWeight: "600",
  },
  listContent: {
    gap: 8,
  },
  deviceRow: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  deviceAddress: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  connectLabel: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
});
