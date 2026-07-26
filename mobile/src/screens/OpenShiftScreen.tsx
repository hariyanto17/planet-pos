import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useOpenShiftMutation } from "../lib/api/shiftApi";
import { useToast } from "../hooks/useToast";

type Props = StackScreenProps<RootStackParamList, "OpenShift">;

export default function OpenShiftScreen({ navigation }: Props) {
  const [openingCashInput, setOpeningCashInput] = useState("500000");
  const [openShift, { isLoading }] = useOpenShiftMutation();
  const { showToast } = useToast();

  const handleOpenShift = async () => {
    const cash = Number(openingCashInput);
    if (isNaN(cash) || cash <= 0) {
      showToast({
        type: "warning",
        title: "Kesalahan Validasi",
        message: "Silakan masukkan jumlah saldo kas awal modal yang valid.",
      });
      return;
    }
    try {
      await openShift({ openingCash: cash }).unwrap();
      showToast({
        type: "success",
        title: "Sukses",
        message: "Shift kasir berhasil dibuka.",
      });
      navigation.goBack();
    } catch (err: any) {
      console.error("Failed to open shift:", err);
      const errMsg = err?.data?.message || "Gagal membuka shift kasir. Silakan coba lagi.";
      showToast({
        type: "error",
        title: "Gagal Buka Shift",
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
        <Text style={styles.title}>Buka Shift Kasir</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Masukkan modal kas awal untuk registrasi laci kasir.</Text>

          <Text style={styles.label}>Kas Awal (Rp)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Saldo kas awal (mis. 500000)"
            placeholderTextColor="#71717a"
            value={openingCashInput}
            onChangeText={setOpeningCashInput}
          />

          <TouchableOpacity
            style={styles.openButton}
            onPress={handleOpenShift}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.openButtonText}>Konfirmasi & Buka Shift</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    flex: 1,
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
    marginBottom: 8,
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
  openButton: {
    height: 48,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  openButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
