import { useContext } from "react";
import { ConfirmationContext, ConfirmationContextType } from "../components/ConfirmationProvider";

export const useConfirmation = (): ConfirmationContextType => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within a ConfirmationProvider");
  }
  return context;
};
