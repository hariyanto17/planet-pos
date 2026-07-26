import React from "react";

interface ShiftStatusBadgeProps {
  status: "OPEN" | "CLOSED";
}

export const ShiftStatusBadge: React.FC<ShiftStatusBadgeProps> = ({ status }) => {
  const isOpen = status === "OPEN";
  return (
    <span
      className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${
        isOpen
          ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-400"
          : "border-zinc-800 bg-zinc-950 text-zinc-500"
      }`}
    >
      {status}
    </span>
  );
};
export default ShiftStatusBadge;
