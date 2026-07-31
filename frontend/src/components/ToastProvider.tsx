"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastVariant = "success" | "info" | "warning" | "error";

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: string;
  isVisible: boolean;
}

interface ToastContextValue {
  notify: (toast: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const getDefaultTitle = (variant: ToastVariant) => {
  switch (variant) {
    case "success":
      return "Berhasil";
    case "warning":
      return "Peringatan";
    case "error":
      return "Terjadi Kesalahan";
    default:
      return "Informasi";
  }
};

const getVariantStyles = (variant: ToastVariant | undefined) => {
  switch (variant) {
    case "success":
      return "bg-emerald-500/10 text-emerald-100 border-emerald-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-100 border-amber-500/20";
    case "error":
      return "bg-rose-500/10 text-rose-100 border-rose-500/20";
    default:
      return "bg-sky-500/10 text-sky-100 border-sky-500/20";
  }
};

const getIcon = (variant: ToastVariant | undefined) => {
  switch (variant) {
    case "success":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      );
    case "warning":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78a1.5 1.5 0 001.29-2.25L13.71 3.86a1.5 1.5 0 00-2.42 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "error":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M15 9l-6 6" />
          <path d="M9 9l6 6" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeoutId = timers.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timers.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, isVisible: false } : toast)),
    );
  }, []);

  const notify = useCallback((options: ToastOptions) => {
    const variant = options.variant ?? "info";
    const title = options.title ?? getDefaultTitle(variant);
    const duration = options.duration ?? (variant === "error" ? 6000 : 4000);
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    setToasts((current) => [{ id, title, message: options.message, variant, duration, isVisible: true }, ...current]);

    const timeoutId = window.setTimeout(() => dismissToast(id), duration);
    timers.current.set(id, timeoutId);
  }, [dismissToast]);

  const contextValue = useMemo(
    () => ({
      notify,
      success: (message: string, title?: string) => notify({ variant: "success", title, message }),
      info: (message: string, title?: string) => notify({ variant: "info", title, message }),
      warning: (message: string, title?: string) => notify({ variant: "warning", title, message }),
      error: (message: string, title?: string) => notify({ variant: "error", title, message }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed inset-x-0 top-4 z-50 flex items-start justify-end px-4 pointer-events-none sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl shadow-black/30 transition duration-200 ease-out ${getVariantStyles(toast.variant)} ${toast.isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
              onTransitionEnd={() => {
                if (!toast.isVisible) {
                  removeToast(toast.id);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-current">{getIcon(toast.variant)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100">{toast.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Tutup pemberitahuan"
                  className="text-zinc-400 hover:text-zinc-100 transition"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
