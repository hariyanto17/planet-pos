import React from "react";
import { Skeleton } from "./Skeleton";

interface DataTableProps {
  headers: (string | React.ReactNode)[];
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({ headers, isLoading, children }) => {
  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-zinc-800">
              {headers.map((h, i) => (
                <th key={i} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-zinc-800/50">
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
