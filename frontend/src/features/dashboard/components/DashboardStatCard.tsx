import React from "react";
import { Skeleton } from "@/components/Skeleton";

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string; // Tailwind color class prefix e.g. "text-indigo-500"
  loading?: boolean;
}

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  icon,
  color = "text-text-primary",
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-6 bg-surface border border-border/80 rounded-2xl flex flex-col gap-3 shadow-md">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-1/3" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-surface border border-border/80 rounded-2xl flex items-center justify-between shadow-md hover:border-border hover:shadow-lg transition-all duration-200">
      <div className="flex flex-col gap-1.5">
        <span className="text-text-muted text-xs font-bold uppercase tracking-wider">{title}</span>
        <span className={`text-3xl font-black tracking-tight ${color}`}>{value}</span>
      </div>
      {icon ? (
        <div className="w-12 h-12 bg-surface-secondary rounded-xl flex items-center justify-center border border-border text-text-secondary">
          {icon}
        </div>
      ) : null}
    </div>
  );
};
export default DashboardStatCard;
