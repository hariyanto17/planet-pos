import React from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No results found",
  description = "Try adjusting your search filters to find what you are looking for.",
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-center">
      <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="font-semibold text-zinc-200 text-lg mb-1">{title}</h3>
      <p className="text-zinc-500 text-sm max-w-sm">{description}</p>
    </div>
  );
};
