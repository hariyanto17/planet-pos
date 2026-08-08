import React from "react";
import { StyleSheet, View, Text } from "react-native";

interface OrderItemNoteProps {
  note?: string | null;
}

import { WarningIcon } from "./CustomIcons";

export const OrderItemNote: React.FC<OrderItemNoteProps> = ({ note }) => {
  if (!note) return null;
  
  return (
    <View style={[styles.container, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
      <WarningIcon color="#fca5a5" />
      <Text style={styles.text}>{note}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#7f1d1d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  text: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "bold",
  },
});
export default OrderItemNote;
