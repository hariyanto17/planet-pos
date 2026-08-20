import React from "react";
import { Button } from "./Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
      <span className="text-sm text-text-muted font-medium">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ←
        </Button>
        
        {/* Render simple page numbers */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
          let pageNum = idx + 1;
          
          // Sliding window logic around current page
          if (currentPage > 3 && totalPages > 5) {
            pageNum = currentPage - 3 + idx;
            if (pageNum + (4 - idx) > totalPages) {
              pageNum = totalPages - 4 + idx;
            }
          }

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                currentPage === pageNum
                  ? "bg-primary text-white shadow-md shadow-primary/10"
                  : "bg-surface-secondary text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          →
        </Button>
      </div>
    </div>
  );
};
export default Pagination;
