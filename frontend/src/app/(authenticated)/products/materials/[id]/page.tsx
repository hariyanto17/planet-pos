"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetProductQuery,
  useUpdateMaterialMutation,
  useCreateMaterialVariantMutation,
  useUpdateMaterialVariantMutation,
  useDeleteMaterialVariantMutation,
  useGetSuppliersQuery,
  useGetSupplierOffersByVariantQuery,
  useCreateSupplierOfferMutation,
  useDeleteSupplierOfferMutation,
  useGetPackagingByVariantQuery,
  useCreatePackagingMutation,
  useUpdatePackagingConfigurationMutation,
  useCreateNewPackagingVersionMutation,
  useGetBrandsQuery,
} from "@/lib/api/productApi";
import { useGetCategoriesQuery } from "@/lib/api/categoryApi";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DataTable } from "@/components/DataTable";
import { IconButton } from "@/components/IconButton";
import { Pencil, Users, Trash2, Archive, ArchiveRestore, GitCompare, Plus } from "lucide-react";

const materialUpdateSchema = zod.object({
  name: zod.string().min(1, "Nama bahan baku wajib diisi"),
  categoryId: zod.string().min(1, "Kategori wajib diisi"),
  brandId: zod.string().nullish(),
  baseUnit: zod.string().min(1, "Satuan dasar wajib diisi"),
  description: zod.string().nullish(),
  isActive: zod.boolean().optional(),
});

type MaterialUpdateInput = zod.infer<typeof materialUpdateSchema>;

const variantFormSchema = zod.object({
  name: zod.string().min(1, "Nama varian wajib diisi"),
  quantityInBaseUnit: zod.number().positive("Jumlah/Isi kemasan harus lebih besar dari 0").or(zod.nan()),
  purchasePrice: zod.number().min(0, "Harga beli tidak boleh negatif").or(zod.nan()),
  sku: zod.string().optional(),
  barcode: zod.string().optional(),
  supplierId: zod.string().optional(),
});

type VariantFormInput = zod.infer<typeof variantFormSchema>;

export default function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: materialId } = React.use(params);

  const { data: material, isLoading: isMaterialLoading, refetch } = useGetProductQuery(materialId);
  const [updateMaterial, { isLoading: isUpdatingMaterial }] = useUpdateMaterialMutation();

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: suppliers = [] } = useGetSuppliersQuery();

  const [activeTab, setActiveTab] = useState<"overview" | "variants" | "packaging">("overview");

  // Variant Mutations
  const [createVariant, { isLoading: isCreatingVariant }] = useCreateMaterialVariantMutation();
  const [updateVariant, { isLoading: isUpdatingVariant }] = useUpdateMaterialVariantMutation();
  const [deleteVariant] = useDeleteMaterialVariantMutation();

  // Modals state
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);

  // Supplier Offers Modal state
  const [activeOffersVariant, setActiveOffersVariant] = useState<any | null>(null);
  const [offerPrice, setOfferPrice] = useState<string>("");
  const [offerSupplierId, setOfferSupplierId] = useState<string>("");
  const [createOffer] = useCreateSupplierOfferMutation();
  const [deleteOffer] = useDeleteSupplierOfferMutation();

  // Packaging Modal state
  const [activePackagingVariant, setActivePackagingVariant] = useState<any | null>(null);
  const [isAddPackagingOpen, setIsAddPackagingOpen] = useState(false);
  const [packagingName, setPackagingName] = useState("");
  const [packagingUnitLabel, setPackagingUnitLabel] = useState("");
  const [packagingConversionFactor, setPackagingConversionFactor] = useState("");
  const [createPackaging] = useCreatePackagingMutation();

  // New Version packaging state
  const [activeConfigForVersion, setActiveConfigForVersion] = useState<any | null>(null);
  const [newVersionFactor, setNewVersionFactor] = useState("");
  const [createNewVersion] = useCreateNewPackagingVersionMutation();

  const {
    register: registerMaterial,
    handleSubmit: handleSubmitMaterial,
    reset: resetMaterial,
    formState: { errors: materialErrors },
  } = useForm<MaterialUpdateInput>({
    resolver: zodResolver(materialUpdateSchema),
    values: material
      ? {
        name: material.name,
        categoryId: material.categoryId || "",
        brandId: material.brandId || "",
        baseUnit: material.baseUnit || "G",
        description: material.description || "",
        isActive: material.isActive,
      }
      : undefined,
  });

  const {
    register: registerVariant,
    handleSubmit: handleSubmitVariant,
    reset: resetVariant,
    watch: watchVariant,
    formState: { errors: variantErrors },
  } = useForm<VariantFormInput>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
    },
  });

  const variantQty = watchVariant("quantityInBaseUnit");
  const variantPrice = watchVariant("purchasePrice");
  const estimatedCost =
    variantQty && variantPrice && !isNaN(variantQty) && !isNaN(variantPrice) && variantQty > 0
      ? Math.round(variantPrice / variantQty)
      : null;

  if (isMaterialLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center p-12">
        <h3 className="text-lg font-bold text-text-primary">Bahan Baku tidak ditemukan</h3>
        <Button variant="secondary" onClick={() => router.push("/products")} className="mt-4">
          Kembali ke Daftar Produk
        </Button>
      </div>
    );
  }

  const handleUpdateMaterial = async (data: MaterialUpdateInput) => {
    try {
      await updateMaterial({
        id: materialId,
        name: data.name,
        categoryId: data.categoryId,
        brandId: data.brandId || undefined,
        description: data.description || undefined,
        isActive: data.isActive,
      }).unwrap();
      alert("Detail bahan baku berhasil diperbarui");
    } catch (err: any) {
      alert(err.data?.message || "Gagal memperbarui bahan baku");
    }
  };

  const handleCreateVariant = async (data: VariantFormInput) => {
    try {
      await createVariant({
        materialId,
        body: {
          name: data.name,
          sku: data.sku || undefined,
          barcode: data.barcode || undefined,
          quantityInBaseUnit: Number(data.quantityInBaseUnit),
          purchasePrice: Number(data.purchasePrice),
          supplierId: data.supplierId || undefined,
        },
      }).unwrap();
      setIsAddVariantOpen(false);
      resetVariant();
    } catch (err: any) {
      alert(err.data?.message || "Gagal membuat varian");
    }
  };

  const handleUpdateVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;
    try {
      await updateVariant({
        id: editingVariant.id,
        materialId,
        body: {
          name: editingVariant.name,
          sku: editingVariant.sku || undefined,
          barcode: editingVariant.barcode || undefined,
          quantityInBaseUnit: Number(editingVariant.quantityInBaseUnit),
          purchasePrice: Number(editingVariant.purchasePrice),
          isActive: editingVariant.isActive,
        },
      }).unwrap();
      setEditingVariant(null);
    } catch (err: any) {
      alert(err.data?.message || "Gagal memperbarui varian");
    }
  };

  const handleDeleteVariantAction = async (variant: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus/menonaktifkan varian ${variant.name}?`)) return;
    try {
      const res = await deleteVariant({ id: variant.id, materialId }).unwrap();
      alert(res.message || "Varian berhasil dihapus/dinonaktifkan");
    } catch (err: any) {
      alert(err.data?.message || "Gagal menghapus varian");
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOffersVariant || !offerSupplierId || !offerPrice) return;
    try {
      await createOffer({
        variantId: activeOffersVariant.id,
        materialId,
        body: {
          supplierId: offerSupplierId,
          unitPrice: Number(offerPrice),
        },
      }).unwrap();
      setOfferPrice("");
      setOfferSupplierId("");
    } catch (err: any) {
      alert(err.data?.message || "Gagal menambahkan penawaran supplier");
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Hapus penawaran supplier ini?")) return;
    try {
      await deleteOffer({ id: offerId, variantId: activeOffersVariant.id, materialId }).unwrap();
    } catch (err: any) {
      alert(err.data?.message || "Gagal menghapus penawaran");
    }
  };

  const handleCreatePackaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePackagingVariant || !packagingName || !packagingConversionFactor) return;
    try {
      await createPackaging({
        variantId: activePackagingVariant.id,
        materialId,
        body: {
          name: packagingName,
          unitLabel: packagingUnitLabel || undefined,
          conversionFactor: Number(packagingConversionFactor),
        },
      }).unwrap();
      setIsAddPackagingOpen(false);
      setPackagingName("");
      setPackagingUnitLabel("");
      setPackagingConversionFactor("");
    } catch (err: any) {
      alert(err.data?.message || "Gagal membuat konfigurasi packaging");
    }
  };

  const handleCreatePackagingVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfigForVersion || !newVersionFactor) return;
    try {
      await createNewVersion({
        configId: activeConfigForVersion.id,
        variantId: activeConfigForVersion.materialVariantId,
        materialId,
        body: {
          conversionFactor: Number(newVersionFactor),
        },
      }).unwrap();
      setActiveConfigForVersion(null);
      setNewVersionFactor("");
    } catch (err: any) {
      alert(err.data?.message || "Gagal membuat versi packaging baru");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => router.push("/products")}
            className="text-text-muted hover:text-text-primary transition text-sm font-medium self-start"
          >
            ← Kembali ke Daftar Produk
          </button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-black tracking-tight text-text-primary">
              {material.name}
            </h1>
            <StatusBadge isActive={material.isActive} />
          </div>
          <p className="text-xs text-text-muted">
            Kategori: {material.category?.name || "-"} | Brand: {material.brand?.name || "-"}
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border">
        {(["overview", "variants", "packaging"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-4 text-sm font-medium border-b-2 transition ${activeTab === tab
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-text-muted hover:text-text-primary"
              }`}
          >
            {tab === "overview" ? "Informasi Umum" : tab === "variants" ? "Varian" : "Packaging"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <form onSubmit={handleSubmitMaterial(handleUpdateMaterial)} className="space-y-4">
            <Input
              label="Nama Bahan Baku"
              {...registerMaterial("name")}
              error={materialErrors.name?.message}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Kategori *</label>
                <select
                  {...registerMaterial("categoryId")}
                  className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
                >
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Brand</label>
                <select
                  {...registerMaterial("brandId")}
                  className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih Brand</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Satuan Dasar *</label>
                <select
                  {...registerMaterial("baseUnit")}
                  disabled
                  className="w-full rounded-md border border-border bg-surface-secondary/40 p-2 text-sm text-text-muted cursor-not-allowed outline-none"
                >
                  <option value="G">Gram (G)</option>
                  <option value="ML">Milliliter (ML)</option>
                  <option value="PCS">Piece (PCS)</option>
                </select>
                <p className="text-[10px] text-text-muted mt-1">Satuan dasar bersifat read-only setelah bahan baku dibuat.</p>
              </div>

              <div className="flex flex-col justify-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary">
                  <input type="checkbox" {...registerMaterial("isActive")} className="rounded border-border" />
                  Status Aktif
                </label>
              </div>
            </div>

            <Input
              label="Deskripsi"
              {...registerMaterial("description")}
              error={materialErrors.description?.message}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isUpdatingMaterial}>
                {isUpdatingMaterial ? "Menyimpan..." : "Perbarui Bahan Baku"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "variants" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-text-primary">Daftar Varian</h3>
            <Button onClick={() => setIsAddVariantOpen(true)}>+ Tambah Varian</Button>
          </div>

          <DataTable
            headers={[
              "Nama Varian",
              "Isi Kemasan",
              "Satuan Dasar",
              "Harga Beli",
              "Cost / Unit",
              "SKU",
              "Status",
              <div className="text-right" key="aksi">Aksi</div>
            ]}
          >
            {material.variants?.map((v: any) => (
              <tr key={v.id} className="hover:bg-surface-secondary/20 transition border-b border-border/50">
                <td className="px-6 py-4 font-bold">{v.name}</td>
                <td className="px-6 py-4">
                  {v.quantityInBaseUnit !== null && v.quantityInBaseUnit !== undefined && !isNaN(Number(v.quantityInBaseUnit))
                    ? Number(v.quantityInBaseUnit).toLocaleString()
                    : "—"}
                </td>
                <td className="px-6 py-4">{v.baseUnit}</td>
                <td className="px-6 py-4">
                  {v.supplierOffers && v.supplierOffers.length > 0
                    ? `Rp ${Number(v.supplierOffers[0].price).toLocaleString()}`
                    : "-"}
                </td>
                <td className="px-6 py-4 text-indigo-400 font-medium">
                  Rp {v.cost ? Number(v.cost).toLocaleString() : 0} / {v.baseUnit}
                </td>
                <td className="px-6 py-4">{v.sku || "-"}</td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={v.isActive} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <IconButton
                      variant="secondary"
                      icon={Pencil}
                      label="Edit Varian"
                      onClick={() => {
                        const mainOffer = v.supplierOffers?.[0];
                        setEditingVariant({
                          id: v.id,
                          name: v.name,
                          sku: v.sku || "",
                          barcode: v.barcode || "",
                          quantityInBaseUnit: v.quantityInBaseUnit,
                          purchasePrice: mainOffer ? Number(mainOffer.price) : 0,
                          isActive: v.isActive,
                        });
                      }}
                    />
                    <div className="relative">
                      <IconButton
                        variant="secondary"
                        icon={Users}
                        label={`Supplier Offers (${v.supplierOffers?.length || 0})`}
                        onClick={() => setActiveOffersVariant(v)}
                      />
                      {v.supplierOffers && v.supplierOffers.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none">
                          {v.supplierOffers.length}
                        </span>
                      )}
                    </div>
                    <IconButton
                      variant="ghost"
                      icon={Trash2}
                      label="Deactivate Varian"
                      className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => handleDeleteVariantAction(v)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}

      {activeTab === "packaging" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-text-primary">Konfigurasi Packaging</h3>
          </div>

          {material.variants?.map((v: any) => (
            <PackagingSection
              key={v.id}
              variant={v}
              material={material}
              onCreateClick={() => {
                setActivePackagingVariant(v);
                setIsAddPackagingOpen(true);
              }}
              onNewVersionClick={(config: any) => setActiveConfigForVersion(config)}
            />
          ))}
        </div>
      )}

      {/* Add Variant Modal */}
      <Modal isOpen={isAddVariantOpen} onClose={() => setIsAddVariantOpen(false)} title="Tambah Varian Baru">
        <form onSubmit={handleSubmitVariant(handleCreateVariant)} className="space-y-4">
          <Input
            label="Nama Varian *"
            placeholder="e.g. 500g, 1kg, 2L"
            {...registerVariant("name")}
            error={variantErrors.name?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Isi Kemasan *"
              type="number"
              placeholder="e.g. 500"
              {...registerVariant("quantityInBaseUnit", { valueAsNumber: true })}
              error={variantErrors.quantityInBaseUnit?.message}
            />
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Satuan Dasar</label>
              <input
                disabled
                value={material.baseUnit}
                className="w-full rounded-md border border-border bg-surface-secondary/40 p-2 text-sm text-text-muted cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU (Opsional)"
              placeholder="SKU-CRM-500"
              {...registerVariant("sku")}
              error={variantErrors.sku?.message}
            />
            <Input
              label="Barcode (Opsional)"
              placeholder="Barcode"
              {...registerVariant("barcode")}
              error={variantErrors.barcode?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Harga Beli Paket *"
              type="number"
              placeholder="e.g. 50000"
              {...registerVariant("purchasePrice", { valueAsNumber: true })}
              error={variantErrors.purchasePrice?.message}
            />
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier Utama (Opsional)</label>
              <select
                {...registerVariant("supplierId")}
                className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
              >
                <option value="">Pilih Supplier</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {estimatedCost !== null && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-400 font-medium">
              Estimasi Harga per Satuan Dasar: Rp {estimatedCost.toLocaleString()} / {material.baseUnit}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddVariantOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isCreatingVariant}>
              {isCreatingVariant ? "Menyimpan..." : "Tambah Varian"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Variant Modal */}
      <Modal isOpen={!!editingVariant} onClose={() => setEditingVariant(null)} title="Edit Varian">
        {editingVariant && (
          <form onSubmit={handleUpdateVariantSubmit} className="space-y-4">
            <Input
              label="Nama Varian *"
              value={editingVariant.name}
              onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Isi Kemasan *"
                type="number"
                value={editingVariant.quantityInBaseUnit}
                onChange={(e) => setEditingVariant({ ...editingVariant, quantityInBaseUnit: Number(e.target.value) })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Satuan Dasar</label>
                <input
                  disabled
                  value={material.baseUnit}
                  className="w-full rounded-md border border-border bg-surface-secondary/40 p-2 text-sm text-text-muted cursor-not-allowed outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SKU (Opsional)"
                value={editingVariant.sku}
                onChange={(e) => setEditingVariant({ ...editingVariant, sku: e.target.value })}
              />
              <Input
                label="Barcode (Opsional)"
                value={editingVariant.barcode}
                onChange={(e) => setEditingVariant({ ...editingVariant, barcode: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Harga Beli *"
                type="number"
                value={editingVariant.purchasePrice}
                onChange={(e) => setEditingVariant({ ...editingVariant, purchasePrice: Number(e.target.value) })}
                required
              />
              <div className="flex items-center pt-6 pl-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={editingVariant.isActive}
                    onChange={(e) => setEditingVariant({ ...editingVariant, isActive: e.target.checked })}
                    className="rounded border-border"
                  />
                  Varian Aktif
                </label>
              </div>
            </div>

            {editingVariant.quantityInBaseUnit > 0 && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-400 font-medium">
                Estimasi Harga per Satuan Dasar: Rp {Math.round(editingVariant.purchasePrice / editingVariant.quantityInBaseUnit).toLocaleString()} / {material.baseUnit}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditingVariant(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={isUpdatingVariant}>
                {isUpdatingVariant ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Supplier Offers management modal */}
      <Modal isOpen={!!activeOffersVariant} onClose={() => setActiveOffersVariant(null)} title={`Supplier Penawaran - ${activeOffersVariant?.name}`}>
        {activeOffersVariant && (
          <div className="space-y-4">
            <SupplierOfferList variantId={activeOffersVariant.id} onDelete={handleDeleteOffer} />

            <form onSubmit={handleAddOffer} className="border-t border-border pt-4 mt-4 space-y-4">
              <h4 className="text-sm font-bold text-text-primary">Tambah Penawaran Supplier</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Supplier *</label>
                  <select
                    value={offerSupplierId}
                    onChange={(e) => setOfferSupplierId(e.target.value)}
                    required
                    className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
                  >
                    <option value="">Pilih Supplier</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Harga Penawaran *"
                  type="number"
                  placeholder="e.g. 48000"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setActiveOffersVariant(null)}>
                  Tutup
                </Button>
                <Button type="submit">Tambah Penawaran</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Add Packaging modal */}
      <Modal isOpen={isAddPackagingOpen} onClose={() => { setIsAddPackagingOpen(false); setActivePackagingVariant(null); }} title={`Tambah Packaging - ${activePackagingVariant?.name}`}>
        <form onSubmit={handleCreatePackaging} className="space-y-4">
          <Input
            label="Nama Unit Kemasan (Configuration Name) *"
            placeholder="e.g. Carton, Box"
            value={packagingName}
            onChange={(e) => setPackagingName(e.target.value)}
            required
          />
          <Input
            label="Label Satuan Kemasan (Opsional)"
            placeholder="e.g. Crt, Bx"
            value={packagingUnitLabel}
            onChange={(e) => setPackagingUnitLabel(e.target.value)}
          />
          <Input
            label="Faktor Konversi (Jumlah Variant dalam unit ini) *"
            type="number"
            placeholder="e.g. 24"
            value={packagingConversionFactor}
            onChange={(e) => setPackagingConversionFactor(e.target.value)}
            required
          />
          {packagingConversionFactor && Number(packagingConversionFactor) > 0 && activePackagingVariant && (
            <div className="text-xs text-indigo-400 bg-surface-secondary/40 p-2 rounded">
              <span className="font-semibold">Pratinjau:</span> 1 {packagingName || "Unit"} = {packagingConversionFactor} × {activePackagingVariant.name} ({Number(packagingConversionFactor) * Number(activePackagingVariant.quantityInBaseUnit)} {material?.baseUnit})
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setIsAddPackagingOpen(false); setActivePackagingVariant(null); }}>
              Batal
            </Button>
            <Button type="submit">Simpan Packaging</Button>
          </div>
        </form>
      </Modal>

      {/* Create New packaging version version factor modal */}
      <Modal isOpen={!!activeConfigForVersion} onClose={() => setActiveConfigForVersion(null)} title={`Buat Versi Baru - ${activeConfigForVersion?.name}`}>
        <form onSubmit={handleCreatePackagingVersion} className="space-y-4">
          <p className="text-xs text-text-muted">
            Membuat versi baru akan menonaktifkan versi saat ini untuk transaksi mendatang. Versi lama tetap tersimpan untuk integritas log transaksi.
          </p>
          <Input
            label="Faktor Konversi Baru *"
            type="number"
            placeholder="e.g. 24"
            value={newVersionFactor}
            onChange={(e) => setNewVersionFactor(e.target.value)}
            required
          />
          {newVersionFactor && Number(newVersionFactor) > 0 && activeConfigForVersion && (
            <div className="text-xs text-indigo-400 bg-surface-secondary/40 p-2 rounded">
              {(() => {
                const versionVariant = material.variants?.find((v: any) => v.id === activeConfigForVersion.variantId);
                if (!versionVariant) return null;
                return (
                  <>
                    <span className="font-semibold">Pratinjau:</span> 1 {activeConfigForVersion.name} = {newVersionFactor} × {versionVariant.name} ({Number(newVersionFactor) * Number(versionVariant.quantityInBaseUnit)} {material?.baseUnit})
                  </>
                );
              })()}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setActiveConfigForVersion(null)}>
              Batal
            </Button>
            <Button type="submit">Buat Versi Baru</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Supplier Offer List helper
function SupplierOfferList({ variantId, onDelete }: { variantId: string; onDelete: (id: string) => void }) {
  const { data: offers = [], isLoading } = useGetSupplierOffersByVariantQuery(variantId);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      <h4 className="text-sm font-bold text-text-primary">Penawaran Supplier Terdaftar</h4>
      {offers.length === 0 ? (
        <p className="text-xs text-text-muted">Belum ada penawaran supplier.</p>
      ) : (
        <div className="space-y-2">
          {offers.map((o: any) => (
            <div key={o.id} className="flex justify-between items-center text-sm p-3 bg-surface-secondary/40 rounded-lg border border-border">
              <div>
                <p className="font-semibold text-text-primary">{o.supplier?.name || "Supplier"}</p>
                <p className="text-[10px] text-text-muted">IDR {Number(o.unitPrice).toLocaleString()}</p>
              </div>
              <IconButton
                variant="ghost"
                icon={Trash2}
                label="Hapus Penawaran Supplier"
                className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                onClick={() => onDelete(o.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// PackagingSection wrapper
function PackagingSection({ variant, material, onCreateClick, onNewVersionClick }: { variant: any; material: any; onCreateClick: () => void; onNewVersionClick: (config: any) => void }) {
  const { data: configs = [], isLoading } = useGetPackagingByVariantQuery(variant.id);
  const [updateConfig] = useUpdatePackagingConfigurationMutation();

  const handleToggleConfigActive = async (config: any) => {
    try {
      await updateConfig({
        id: config.id,
        variantId: variant.id,
        materialId: material.id,
        body: { isActive: !config.isActive },
      }).unwrap();
    } catch (err: any) {
      alert("Gagal memperbarui status packaging");
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-surface/50 space-y-4">
      <div className="flex justify-between items-center border-b border-border/40 pb-2">
        <div>
          <h4 className="text-sm font-bold text-text-primary">Packaging untuk Varian: {variant.name}</h4>
          <p className="text-[10px] text-text-muted">ID: {variant.id}</p>
        </div>
        <Button onClick={onCreateClick}>+ Tambah Packaging</Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : configs.length === 0 ? (
        <p className="text-xs text-text-muted py-2">Belum ada konfigurasi packaging untuk varian ini.</p>
      ) : (
        <div className="space-y-4">
          {configs.map((c: any) => {
            const activeVersion = c.versions?.find((v: any) => v.isActive);
            return (
              <div key={c.id} className="p-3 rounded-lg border border-border/50 bg-surface space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="text-sm font-bold text-text-primary">{c.name}</h5>
                    {c.unitLabel && <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">{c.unitLabel}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge isActive={c.isActive} />
                    <IconButton
                      variant="secondary"
                      icon={c.isActive ? Archive : ArchiveRestore}
                      label={c.isActive ? "Nonaktifkan Packaging" : "Aktifkan Packaging"}
                      onClick={() => handleToggleConfigActive(c)}
                    />
                    <IconButton
                      variant="secondary"
                      icon={GitCompare}
                      label="Versi Baru"
                      onClick={() => onNewVersionClick(c)}
                    />
                  </div>
                </div>

                {activeVersion && (
                  <div className="text-xs text-text-secondary bg-surface-secondary/40 p-2 rounded">
                    <p className="font-semibold">Versi Aktif (V{activeVersion.versionNumber})</p>
                    <p className="mt-1">
                      1 {c.name} = {Number(activeVersion.conversionFactor)} × {variant.name} ({Number(activeVersion.normalizedToBaseQuantity)} {material.baseUnit})
                    </p>
                  </div>
                )}

                {/* Packaging History */}
                {c.versions?.length > 1 && (
                  <details className="text-xs text-text-muted mt-2 cursor-pointer">
                    <summary className="text-[10px] font-semibold text-indigo-400 outline-none">Lihat Riwayat Versi ({c.versions.length})</summary>
                    <div className="mt-2 space-y-1 pl-2 border-l border-border">
                      {c.versions.map((ver: any) => (
                        <div key={ver.id} className="flex justify-between items-center py-1">
                          <span>Versi {ver.versionNumber} ({Number(ver.conversionFactor)}x)</span>
                          <span className="text-[10px]">{ver.isActive ? "Aktif" : `Kedaluwarsa pada ${new Date(ver.effectiveTo).toLocaleDateString()}`}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
