import React from "react";

interface StatusBadgeProps {
  isActive: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ isActive }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isActive
          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-500"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};
