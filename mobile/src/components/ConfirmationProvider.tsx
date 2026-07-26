import React, { createContext, useState, useCallback, ReactNode } from "react";
import { ConfirmationModal } from "./ConfirmationModal"; // import verified

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "success" | "warning" | "danger" | "info";
  onConfirm?: () => Promise<void> | void;
}

export interface ConfirmationContextType {
  showConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
}

export const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

interface ConfirmationState extends ConfirmationOptions {
  visible: boolean;
  loading: boolean;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmationProviderProps {
  children: ReactNode;
}

const defaultState: ConfirmationState = {
  visible: false,
  loading: false,
  title: "",
  message: "",
  confirmText: "Konfirmasi",
  cancelText: "Batal",
  variant: "info",
  resolve: null,
};

export const ConfirmationProvider: React.FC<ConfirmationProviderProps> = ({ children }) => {
  const [state, setState] = useState<ConfirmationState>(defaultState);

  const showConfirmation = useCallback((options: ConfirmationOptions) => {
    // Prevent duplicate confirmation modals from mounting
    if (state.visible) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      setState({
        visible: true,
        loading: false,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || "Konfirmasi",
        cancelText: options.cancelText || "Batal",
        variant: options.variant || "info",
        onConfirm: options.onConfirm,
        resolve,
      });
    });
  }, [state.visible]);

  const handleConfirm = useCallback(async () => {
    if (state.loading) return; // Prevent duplicate clicks
    
    if (state.onConfirm) {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await state.onConfirm();
        if (state.resolve) state.resolve(true);
        setState(defaultState);
      } catch (error) {
        console.error("Async confirmation callback failed:", error);
        setState((prev) => ({ ...prev, loading: false }));
        // Let the caller handle error reporting via toast
      }
    } else {
      if (state.resolve) state.resolve(true);
      setState(defaultState);
    }
  }, [state]);

  const handleCancel = useCallback(() => {
    if (state.loading) return; // Prevent canceling while loading
    if (state.resolve) state.resolve(false);
    setState(defaultState);
  }, [state]);

  return (
    <ConfirmationContext.Provider value={{ showConfirmation }}>
      {children}
      <ConfirmationModal
        visible={state.visible}
        loading={state.loading}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText || "Konfirmasi"}
        cancelText={state.cancelText || "Batal"}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmationContext.Provider>
  );
};
