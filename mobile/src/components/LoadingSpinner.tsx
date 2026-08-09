import React, { useMemo } from "react";
import { StyleSheet, ActivityIndicator, View, Text } from "react-native";
import { useTheme, Theme } from "../theme";

export const LoadingSpinner: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.text}>Loading application state...</Text>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  text: {
    color: theme.textSecondary,
    fontSize: 14,
  },
});
