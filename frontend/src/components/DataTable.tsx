import React from "react";
import { Skeleton } from "./Skeleton";

interface DataTableProps {
  headers: (string | React.ReactNode)[];
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({ headers, isLoading, children }) => {
  return (
    <div className="w-full bg-surface border border-border rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-secondary border-b border-border">
              {headers.map((h, i) => (
                <th key={i} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-border/50">
                  {headers.map((_, hIdx) => (
                    <td key={hIdx} className="px-6 py-4">
                      <Skeleton className="h-4 w-2/3" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
