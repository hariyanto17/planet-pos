import React from "react";

interface DashboardSectionProps {
  title: string;
  children: React.ReactNode;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-text-muted text-xs font-black uppercase tracking-widest border-b border-border/80 pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
};
export default DashboardSection;
