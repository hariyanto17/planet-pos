import React from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { useGetProductQuery } from "@/lib/api/productApi";
import { StatusBadge } from "@/components/StatusBadge";

interface RawMaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string | null;
}

export const RawMaterialDetailModal: React.FC<RawMaterialDetailModalProps> = ({
  isOpen,
  onClose,
  materialId,
}) => {
  const { data: material, isLoading } = useGetProductQuery(materialId || "", {
    skip: !materialId,
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Bahan Baku" maxWidth="max-w-3xl">
      {isLoading ? (
        <div className="py-12 text-center text-sm text-text-secondary">Loading detail...</div>
      ) : material ? (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-surface-secondary/30 p-4 rounded-xl border border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Nama Bahan Baku</span>
              <p className="text-base font-semibold text-text-primary mt-1">{material.name}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Satuan Dasar</span>
              <p className="text-sm font-medium text-text-primary mt-1">{material.baseUnit || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Kategori</span>
              <p className="text-sm font-medium text-text-primary mt-1">{material.category?.name || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Brand</span>
              <p className="text-sm font-medium text-text-primary mt-1">{material.brand?.name || "-"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase">Status Keaktifan</span>
              <div className="mt-1">
                <StatusBadge isActive={material.isActive} />
              </div>
            </div>
            {material.description && (
              <div className="md:col-span-2">
                <span className="text-xs font-semibold text-text-muted uppercase">Deskripsi</span>
                <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{material.description}</p>
              </div>
            )}
          </div>

          {/* Variants section */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2 mb-4">
              Varian Terdaftar ({material.variants?.length || 0})
            </h4>

            {!material.variants || material.variants.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Belum ada varian yang dibuat.</p>
            ) : (
              <div className="space-y-4">
                {material.variants.map((v: any) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-sm font-bold text-text-primary">{v.name}</h5>
                        <p className="text-[10px] text-text-muted mt-0.5">ID Varian: {v.id}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                        Unit: {material.baseUnit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-text-muted font-medium">SKU:</span>
                        <p className="font-semibold text-text-primary mt-0.5">{v.sku || "-"}</p>
                      </div>
                      <div>
                        <span className="text-text-muted font-medium">Barcode:</span>
                        <p className="font-semibold text-text-primary mt-0.5">{v.barcode || "-"}</p>
                      </div>
                      <div>
                        <span className="text-text-muted font-medium">Harga Unit Dasar:</span>
                        <p className="font-semibold text-text-primary mt-0.5">
                          {v.cost ? `Rp ${Number(v.cost).toLocaleString()} / ${material.baseUnit}` : "-"}
                        </p>
                      </div>
                    </div>

                    {/* Supplier Offers for this variant */}
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        Supplier & Harga Penawaran Paket
                      </span>
                      {v.supplierOffers && v.supplierOffers.length > 0 ? (
                        <div className="mt-1.5 space-y-1">
                          {v.supplierOffers.map((offer: any) => (
                            <div
                              key={offer.id}
                              className="flex justify-between text-xs py-1 px-2 bg-surface/50 rounded border border-border/30"
                            >
                              <span className="font-medium text-text-secondary">
                                {offer.supplierName || "Supplier Tidak Dikenal"}
                              </span>
                              <span className="font-semibold text-text-primary">
                                Rp {Number(offer.price).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-text-muted mt-1">Belum ada supplier offer yang terdaftar.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
