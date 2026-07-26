import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useCloseShiftMutation } from "../lib/api/shiftApi";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";

type Props = StackScreenProps<RootStackParamList, "CloseShift">;

export default function CloseShiftScreen({ route, navigation }: Props) {
  const { shiftId, expectedCash } = route.params;
  const [actualCashInput, setActualCashInput] = useState("");
  const [notes, setNotes] = useState("");
  const [closeShift, { isLoading }] = useCloseShiftMutation();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();

  const actualCash = Number(actualCashInput);
  const isActualCashValid = actualCashInput.trim() !== "" && !isNaN(actualCash) && actualCash >= 0;
  const difference = isActualCashValid ? actualCash - expectedCash : 0;

  const handleCloseShift = async () => {
    if (actualCashInput.trim() === "" || isNaN(actualCash) || actualCash < 0) {
      showToast({
        type: "warning",
        title: "Kesalahan Validasi",
        message: "Silakan masukkan jumlah kas riil dihitung yang valid.",
      });
      return;
    }

    const confirmed = await showConfirmation({
      title: "Tutup Shift",
      message: "Apakah Anda yakin ingin menutup shift kasir ini? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Tutup Shift",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await closeShift({
        id: shiftId,
        body: {
          actualCash,
          notes: notes.trim(),
        },
      }).unwrap();

      showToast({
        type: "success",
        title: "Sukses",
        message: "Shift kasir berhasil ditutup.",
      });
      navigation.navigate("CashierTabs");
    } catch (err: any) {
      console.error("Failed to close shift:", err);
      const errMsg = err?.data?.message || "Gagal menutup shift kasir. Silakan coba lagi.";
      showToast({
        type: "error",
        title: "Gagal Tutup Shift",
        message: errMsg,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Batal</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tutup Shift Kasir</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.subtitle}>
            Silakan hitung kas laci fisik dan rekonsiliasikan saldo sebelum menutup registrasi shift.
          </Text>

          {/* Expected vs counted calculations */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kas Diharapkan</Text>
              <Text style={styles.summaryValue}>Rp {Number(expectedCash).toLocaleString()}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kas Dihitung</Text>
              <Text style={[styles.summaryValue, isActualCashValid ? { color: "#ffffff" } : { color: "#71717a" }]}>
                {isActualCashValid ? `Rp ${actualCash.toLocaleString()}` : "Masukkan jumlah dihitung"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selisih Rekonsiliasi</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { fontWeight: "bold" },
                  difference === 0
                    ? { color: "#10b981" }
                    : difference > 0
                    ? { color: "#eab308" }
                    : { color: "#ef4444" },
                ]}
              >
                {isActualCashValid
                  ? `${difference >= 0 ? "+" : ""}Rp ${difference.toLocaleString()}`
                  : "-"}
              </Text>
            </View>
          </View>

          {/* Actual Cash Input */}
          <Text style={styles.label}>Kas Riil Dihitung (Rp)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Saldo kas laci fisik yang dihitung"
            placeholderTextColor="#71717a"
            value={actualCashInput}
            onChangeText={setActualCashInput}
          />

          {/* Notes Input */}
          <Text style={styles.label}>Catatan Audit (Opsional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="Tambahkan catatan untuk selisih shift atau log audit"
            placeholderTextColor="#71717a"
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={[styles.closeButton, !isActualCashValid && styles.disabledBtn]}
            onPress={handleCloseShift}
            disabled={isLoading || !isActualCashValid}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.closeButtonText}>Konfirmasi & Tutup Shift</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  subtitle: {
    fontSize: 13,
    color: "#71717a",
    lineHeight: 18,
    marginBottom: 8,
  },
  summaryBox: {
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#a1a1aa",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    color: "#f4f4f5",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#27272a",
  },
  label: {
    fontSize: 11,
    color: "#a1a1aa",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#f4f4f5",
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  closeButton: {
    height: 48,
    backgroundColor: "#e11d48",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  closeButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
