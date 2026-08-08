import React from "react";
import { StyleSheet, Text, View, SafeAreaView, StatusBar } from "react-native";

export default function KDSScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Layar Dapur (KDS)</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Kitchen Display System</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#f4f4f5",
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#71717a",
  },
});
