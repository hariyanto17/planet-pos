import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useCloseShiftMutation } from "../lib/api/shiftApi";
import { useToast } from "../hooks/useToast";
import { useConfirmation } from "../hooks/useConfirmation";
import { useTheme, Theme } from "../theme";

type Props = StackScreenProps<RootStackParamList, "CloseShift">;

export default function CloseShiftScreen({ route, navigation }: Props) {
  const { shiftId, expectedCash } = route.params;
  const [actualCashInput, setActualCashInput] = useState("");
  const [notes, setNotes] = useState("");
  const [closeShift, { isLoading }] = useCloseShiftMutation();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
              <Text style={[styles.summaryValue, isActualCashValid ? { color: theme.textPrimary } : { color: theme.textMuted }]}>
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
                    ? { color: theme.success }
                    : difference > 0
                    ? { color: theme.warning }
                    : { color: theme.error },
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
    width: 44,
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
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  summaryBox: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
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
    color: theme.textSecondary,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    color: theme.textPrimary,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
  },
  label: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: theme.textPrimary,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  closeButton: {
    height: 48,
    backgroundColor: theme.error,
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
