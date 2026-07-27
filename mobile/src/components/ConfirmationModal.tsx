import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { ALERT_THEME } from "../lib/theme/alert";

interface ConfirmationModalProps {
  visible: boolean;
  loading: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant?: "success" | "warning" | "danger" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 600;

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  loading,
  title,
  message,
  confirmText,
  cancelText,
  variant = "info",
  onConfirm,
  onCancel,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const theme = ALERT_THEME[variant] || ALERT_THEME.info;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  if (!shouldRender) return null;

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Click outside to cancel */}
        <TouchableWithoutFeedback onPress={loading ? undefined : onCancel}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Slide up confirmation panel */}
        <Animated.View
          style={[
            styles.sheetPanel,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Text style={[styles.iconText, { color: theme.iconColor }]}>{theme.icon}</Text>
            </View>
            <Text style={styles.titleText}>{title}</Text>
          </View>

          <Text style={styles.messageText}>{message}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={loading}
              accessibilityLabel={cancelText}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn, { backgroundColor: theme.border }]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityLabel={confirmText}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
  },
  sheetPanel: {
    width: isTablet ? "50%" : "100%",
    backgroundColor: "#18181b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 24,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  titleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f4f4f5",
  },
  messageText: {
    fontSize: 14,
    color: "#a1a1aa",
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#27272a",
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  cancelBtnText: {
    color: "#a1a1aa",
    fontSize: 15,
    fontWeight: "600",
  },
  confirmBtn: {},
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
