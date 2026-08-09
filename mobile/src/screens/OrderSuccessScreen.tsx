import React, { useMemo, useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { CheckIcon } from "../components/CustomIcons";
import { useTheme, Theme } from "../theme";
import { useGetOrderQuery } from "../lib/api/orderApi";
import PrinterService from "../services/PrinterService";
import { useToast } from "../hooks/useToast";

type Props = StackScreenProps<RootStackParamList, "OrderSuccess">;

export default function OrderSuccessScreen({ route, navigation }: Props) {
  const { displayNumber, grandTotal, changeAmount, paymentMethod, orderId } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showToast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch the order for printing
  const { data: order } = useGetOrderQuery(orderId || "", { skip: !orderId });

  // Auto-print receipt on load if printer is connected and order is loaded
  useEffect(() => {
    let active = true;
    const autoPrint = async () => {
      const isConnected = await PrinterService.isConnected();
      if (isConnected && order && active) {
        setIsPrinting(true);
        try {
          const receiptText = PrinterService.formatReceipt(order);
          await PrinterService.printReceipt(receiptText);
        } catch (error) {
          console.warn("Auto print error:", error);
        } finally {
          if (active) setIsPrinting(false);
        }
      }
    };

    if (order) {
      autoPrint();
    }

    return () => {
      active = false;
    };
  }, [order]);

  const handleManualPrint = async () => {
    if (!order) {
      showToast({
        type: "warning",
        title: "Data Belum Siap",
        message: "Menunggu data pesanan selesai dimuat.",
      });
      return;
    }

    const isConnected = await PrinterService.isConnected();
    if (!isConnected) {
      showToast({
        type: "error",
        title: "Printer Terputus",
        message: "Silakan hubungkan printer di menu profil terlebih dahulu.",
      });
      return;
    }

    setIsPrinting(true);
    try {
      const receiptText = PrinterService.formatReceipt(order);
      const success = await PrinterService.printReceipt(receiptText);
      if (success) {
        showToast({
          type: "success",
          title: "Sukses",
          message: "Struk berhasil dicetak.",
        });
      } else {
        showToast({
          type: "error",
          title: "Cetak Gagal",
          message: "Gagal mengirim data cetak ke printer.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Cetak Gagal",
        message: "Terjadi kesalahan saat mencetak.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.successIcon}>
          <CheckIcon color={theme.success} />
        </View>

        <Text style={styles.title}>Pesanan Berhasil Dibuat</Text>
        <Text style={styles.ticketNo}>Tiket: {displayNumber}</Text>

        <View style={styles.divider} />

        <View style={styles.billingCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Tagihan</Text>
            <Text style={styles.value}>Rp {Number(grandTotal).toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Metode Pembayaran</Text>
            <Text style={styles.value}>{paymentMethod === "CASH" ? "TUNAI" : paymentMethod}</Text>
          </View>
          {paymentMethod === "CASH" && (
            <View style={styles.row}>
              <Text style={styles.label}>Uang Kembalian</Text>
              <Text style={[styles.value, { color: theme.success }]}>
                Rp {Number(changeAmount).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.info}>Dapur konsesi telah menerima antrean pesanan ini.</Text>

        <TouchableOpacity
          style={[styles.secondaryButton, isPrinting && styles.disabledButton]}
          onPress={handleManualPrint}
          disabled={isPrinting}
        >
          {isPrinting ? (
            <ActivityIndicator size="small" color={theme.textPrimary} />
          ) : (
            <Text style={styles.secondaryBtnText}>Cetak Struk</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("CashierTabs")}>
          <Text style={styles.btnText}>Selesai</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.success + "15",
    borderWidth: 1,
    borderColor: theme.success + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  check: {
    color: theme.success,
    fontSize: 28,
    fontWeight: "bold",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.textPrimary,
    textAlign: "center",
  },
  ticketNo: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.primary,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    width: "100%",
    marginVertical: 18,
  },
  billingCard: {
    width: "100%",
    gap: 8,
    marginBottom: 20,
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
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    color: theme.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 24,
  },
  button: {
    height: 40,
    backgroundColor: theme.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 8,
  },
  secondaryBtnText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
