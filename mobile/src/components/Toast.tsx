import React, { useEffect, useRef, useCallback } from "react";
import { StyleSheet, Text, View, Animated, TouchableOpacity } from "react-native";
import { ALERT_THEME } from "../lib/theme/alert";

interface ToastProps {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, type, title, message, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const theme = ALERT_THEME[type] || ALERT_THEME.info;

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  }, [id, onDismiss, slideAnim, opacityAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleDismiss();
    }, 3500);

    return () => clearTimeout(timer);
  }, [handleDismiss, slideAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.toastCard,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconContainer, { backgroundColor: theme.border }]}>
          <Text style={styles.iconText}>{theme.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.messageText, { color: theme.text }]} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastCard: {
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignSelf: "flex-end",
    width: "100%",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12,
    opacity: 0.9,
  },
  closeBtn: {
    padding: 4,
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
