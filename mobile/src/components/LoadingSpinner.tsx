import React from "react";
import { StyleSheet, ActivityIndicator, View, Text } from "react-native";

export const LoadingSpinner: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={styles.text}>Loading application state...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  text: {
    color: "#a1a1aa",
    fontSize: 14,
  },
});
