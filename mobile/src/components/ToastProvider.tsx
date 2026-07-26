import React, { createContext, useState, useCallback, ReactNode } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { Toast } from "./Toast";

export interface ToastOptions {
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
}

export interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastProviderProps {
  children: ReactNode;
}

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 600;
const containerWidth = isTablet ? screenWidth * 0.25 : screenWidth * 0.85;

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...options, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container overlay */}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onDismiss={dismissToast}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 50, // Buffer for notch/status bar area
    right: 16,
    width: containerWidth,
    zIndex: 9999,
    gap: 8,
  },
});
