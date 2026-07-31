"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { registerConfirmDialog, ConfirmDialogOptions } from "@/lib/confirmDialog";

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<ConfirmDialogOptions & { isOpen: boolean; resolve?: (confirmed: boolean) => void }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: undefined,
    cancelText: undefined,
    variant: "warning",
    resolve: undefined,
  });

  const requestConfirmation = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        ...options,
        isOpen: true,
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    const unregister = registerConfirmDialog(requestConfirmation);
    return () => unregister();
  }, [requestConfirmation]);

  const handleClose = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(false);
    }
    setDialogState((current) => ({ ...current, isOpen: false, resolve: undefined }));
  }, [dialogState]);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(true);
    }
    setDialogState((current) => ({ ...current, isOpen: false, resolve: undefined }));
  }, [dialogState]);

  return (
    <>
      {children}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogState.title || "Konfirmasi"}
        message={dialogState.message || "Apakah Anda yakin ingin melanjutkan tindakan ini?"}
        confirmText={dialogState.confirmText ?? "Ya, lanjutkan"}
        cancelText={dialogState.cancelText ?? "Batal"}
        variant={dialogState.variant}
        isConfirming={false}
      />
    </>
  );
};
