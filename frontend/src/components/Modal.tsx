import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
  maxHeight = "max-h-[75vh]",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full ${maxWidth} ${maxHeight} bg-surface border border-border rounded-xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text-primary">{title || "Dialog"}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-secondary text-text-secondary hover:text-text-primary rounded-md transition duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="p-4 flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
