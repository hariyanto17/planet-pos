import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";

interface ProductRankingTableProps {
  data?: any;
  isLoading: boolean;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const ProductRankingTable: React.FC<ProductRankingTableProps> = ({
  data,
  isLoading,
  page,
  limit,
  onPageChange,
}) => {
  const products = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 20, totalItems: 0, totalPages: 0 };

  return (
    <div className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl shadow-md">
      <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">
        Product Performance Ranking
      </span>

      <DataTable
        headers={["Rank", "Product Name", "SKU", "Category", "Quantity Sold", "Revenue"]}
        isLoading={isLoading}
      >
        {products.map((p: any, idx: number) => {
          const rank = (page - 1) * limit + idx + 1;
          return (
            <tr key={p.productId} className="border-b border-zinc-800/50 hover:bg-zinc-900/10 transition">
              <td className="px-6 py-4 text-sm font-extrabold text-zinc-500">#{rank}</td>
              <td className="px-6 py-4 text-sm font-bold text-zinc-200">{p.productName}</td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-400 font-mono">{p.sku}</td>
              <td className="px-6 py-4 text-sm text-zinc-500 font-bold uppercase tracking-wide">
                {p.category}
              </td>
              <td className="px-6 py-4 text-sm font-black text-indigo-400 text-right pr-12">
                {p.quantitySold}
              </td>
              <td className="px-6 py-4 text-sm font-black text-emerald-400">
                {formatCurrency(p.revenue)}
              </td>
            </tr>
          );
        })}
      </DataTable>

      {products.length === 0 && !isLoading && (
        <div className="p-8 border border-zinc-800/60 bg-zinc-950/20 text-center rounded-xl text-zinc-500 text-sm">
          No product sales matching active filter criteria.
        </div>
      )}

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};
export default ProductRankingTable;
