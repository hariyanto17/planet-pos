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
    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-4">
      <span className="text-sm text-zinc-500 font-medium">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ← Prev
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
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
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
          Next →
        </Button>
      </div>
    </div>
  );
};
export default Pagination;
