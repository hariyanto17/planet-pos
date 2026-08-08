import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actionButton }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {actionButton ? <div className="flex items-center">{actionButton}</div> : null}
    </div>
  );
};
