export type ConfirmDialogVariant = "default" | "danger" | "delete" | "deactivate" | "warning" | "info";

export interface ConfirmDialogOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
}

type ConfirmRequestHandler = (options: ConfirmDialogOptions) => Promise<boolean>;

let confirmationHandler: ConfirmRequestHandler | null = null;

export const registerConfirmDialog = (handler: ConfirmRequestHandler) => {
  confirmationHandler = handler;
  return () => {
    confirmationHandler = null;
  };
};

export const confirmDialog = async (options: ConfirmDialogOptions): Promise<boolean> => {
  if (!confirmationHandler) {
    throw new Error("No ConfirmDialogProvider mounted. Wrap your app with ConfirmDialogProvider.");
  }

  return confirmationHandler(options);
};
