import React from "react";

interface StatusBadgeProps {
  isActive: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ isActive }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isActive
          ? "bg-success/10 text-success border border-success/20"
          : "bg-surface-secondary text-text-muted border border-border"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-success" : "bg-text-muted"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};
