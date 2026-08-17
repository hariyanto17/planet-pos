import React, { useMemo } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { useGetProductQuery } from "@/lib/api/productApi";
import { StatusBadge } from "@/components/StatusBadge";

interface FinishedProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
}

export const FinishedProductDetailModal: React.FC<FinishedProductDetailModalProps> = ({
  isOpen,
  onClose,
  productId,
}) => {
  const { data: product, isLoading } = useGetProductQuery(productId || "", {
    skip: !productId,
  });

  // Calculate total recipe cost and gross margin
  const recipeStats = useMemo(() => {
    if (!product || !product.recipe || !product.recipe.items) return null;

    let totalCost = 0;
    const items = product.recipe.items.map((item: any) => {
      const unitCost = item.materialVariant?.cost ? Number(item.materialVariant.cost) : 0;
      const quantity = Number(item.quantity);
      const itemCost = quantity * unitCost;
      totalCost += itemCost;

      return {
        ...item,
        unitCost,
        itemCost,
      };
    });

    const price = product.price ? Number(product.price) : 0;
    const grossMargin = price - totalCost;
    const marginPercent = price > 0 ? (grossMargin / price) * 100 : 0;

    return {
      items,
      totalCost,
      grossMargin,
      marginPercent,
    };
  }, [product]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Produk Jadi" maxWidth="max-w-3xl">
      {isLoading ? (
        <div className="py-12 text-center text-sm text-text-secondary">Loading detail...</div>
      ) : product ? (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-surface-secondary/30 p-4 rounded-xl border border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Nama Produk</span>
              <p className="text-base font-semibold text-text-primary mt-1">{product.name}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Kategori</span>
              <p className="text-sm font-medium text-text-primary mt-1">{product.category?.name || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Brand</span>
              <p className="text-sm font-medium text-text-primary mt-1">{product.brand?.name || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Tipe Produk</span>
              <p className="text-sm font-medium text-text-primary mt-1">
                {product.productType === "DIRECT_SALE" ? "Penjualan Langsung (Direct Sale)" : "Berdasarkan Resep (Recipe Based)"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">SKU</span>
              <p className="text-sm font-medium text-text-primary mt-1">{product.sku || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Barcode</span>
              <p className="text-sm font-medium text-text-primary mt-1">{product.barcode || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Harga Jual</span>
              <p className="text-base font-bold text-emerald-400 mt-1">
                {product.price ? `Rp ${Number(product.price).toLocaleString()}` : "-"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Status Keaktifan</span>
              <div className="mt-1">
                <StatusBadge isActive={product.isActive} />
              </div>
            </div>
          </div>

          {/* Recipe details section */}
          {product.productType === "RECIPE_BASED" && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2 mb-4">
                Bahan Baku Resep
              </h4>

              {!recipeStats ? (
                <p className="text-sm text-text-muted text-center py-6">Resep belum dikonfigurasi.</p>
              ) : (
                <div className="space-y-4">
                  {/* Recipe Stats Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-secondary/50 p-4 rounded-xl border border-border">
                    <div>
                      <span className="text-xs text-text-muted">Total Modal Resep</span>
                      <p className="text-sm font-bold text-text-primary mt-0.5">
                        Rp {recipeStats.totalCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">Margin Kotor</span>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">
                        Rp {recipeStats.grossMargin.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">Persentase Margin</span>
                      <p className="text-sm font-bold text-indigo-400 mt-0.5">
                        {recipeStats.marginPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Recipe Items Table */}
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-surface-secondary/60 text-text-muted border-b border-border uppercase font-semibold">
                          <th className="px-4 py-3">Bahan Baku</th>
                          <th className="px-4 py-3">Jumlah</th>
                          <th className="px-4 py-3">Harga Unit Dasar</th>
                          <th className="px-4 py-3 text-right">Subtotal Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipeStats.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-border/50 hover:bg-surface/20">
                            <td className="px-4 py-3 font-medium text-text-primary">
                              {item.materialVariant?.name || "Bahan Tidak Dikenal"}
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              {Number(item.quantity)} {item.materialVariant?.baseUnit}
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              Rp {item.unitCost.toLocaleString()} / {item.materialVariant?.baseUnit}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-text-primary">
                              Rp {item.itemCost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-text-secondary">Detail tidak ditemukan.</div>
      )}
    </Modal>
  );
};
