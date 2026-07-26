import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = StackScreenProps<RootStackParamList, "OrderSuccess">;

export default function OrderSuccessScreen({ route, navigation }: Props) {
  const { displayNumber, grandTotal, changeAmount, paymentMethod } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.successIcon}>
          <Text style={styles.check}>✓</Text>
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
              <Text style={[styles.value, { color: "#10b981" }]}>
                Rp {Number(changeAmount).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.info}>Dapur konsesi telah menerima antrean pesanan ini.</Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("CashierTabs")}>
          <Text style={styles.btnText}>Selesai</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
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
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  check: {
    color: "#10b981",
    fontSize: 28,
    fontWeight: "bold",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f4f4f5",
    textAlign: "center",
  },
  ticketNo: {
    fontSize: 24,
    fontWeight: "black",
    color: "#4f46e5",
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#27272a",
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
    color: "#71717a",
    fontSize: 13,
  },
  value: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    color: "#a1a1aa",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 24,
  },
  button: {
    height: 40,
    backgroundColor: "#4f46e5",
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
});
