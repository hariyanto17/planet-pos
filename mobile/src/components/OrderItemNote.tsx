import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useTheme, Theme } from "../theme";
import { WarningIcon } from "./CustomIcons";

interface OrderItemNoteProps {
  note?: string | null;
}

export const OrderItemNote: React.FC<OrderItemNoteProps> = ({ note }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!note) return null;
  
  return (
    <View style={[styles.container, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
      <WarningIcon color={theme.error} />
      <Text style={styles.text}>{note}</Text>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  text: {
    color: theme.error,
    fontSize: 11,
    fontWeight: "bold",
  },
});
export default OrderItemNote;
