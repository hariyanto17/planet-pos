"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetProductQuery,
  useUpdateProductMutation,
  useGetProductRecipeQuery,
  useUpdateProductRecipeMutation,
  useGetMaterialsQuery,
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
import { Trash2 } from "lucide-react";

const productUpdateSchema = zod.object({
  name: zod.string().min(1, "Nama produk wajib diisi"),
  sku: zod.string().nullish(),
  categoryId: zod.string().min(1, "Kategori wajib diisi"),
  brandId: zod.string().nullish(),
  price: zod.number().min(0, "Harga jual tidak boleh negatif").or(zod.nan()),
  isActive: zod.boolean().optional(),
});

type ProductUpdateInput = zod.infer<typeof productUpdateSchema>;

export default function SellableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: productId } = React.use(params);

  const { data: product, isLoading: isProductLoading, refetch: refetchProduct } = useGetProductQuery(productId);
  const { data: recipeData, isLoading: isRecipeLoading, refetch: refetchRecipe } = useGetProductRecipeQuery(productId);

  const [updateProduct, { isLoading: isUpdatingProduct }] = useUpdateProductMutation();
  const [updateRecipe, { isLoading: isUpdatingRecipe }] = useUpdateProductRecipeMutation();

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: materials = [] } = useGetMaterialsQuery();

  const [activeTab, setActiveTab] = useState<"overview" | "recipe" | "margin">("overview");

  // Recipe modal state
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [ingredientQuantity, setIngredientQuantity] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductUpdateInput>({
    resolver: zodResolver(productUpdateSchema),
    values: product
      ? {
          name: product.name,
          sku: product.sku || "",
          categoryId: product.categoryId || "",
          brandId: product.brandId || "",
          price: product.price ? Number(product.price) : 0,
          isActive: product.isActive,
        }
      : undefined,
  });

  if (isProductLoading || isRecipeLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center p-12">
        <h3 className="text-lg font-bold text-text-primary">Produk tidak ditemukan</h3>
        <Button variant="secondary" onClick={() => router.push("/products")} className="mt-4">
          Kembali ke Daftar Produk
        </Button>
      </div>
    );
  }

  const handleUpdateProduct = async (data: ProductUpdateInput) => {
    try {
      await updateProduct({
        id: productId,
        body: {
          name: data.name,
          sku: data.sku || null,
          categoryId: data.categoryId,
          brandId: data.brandId || null,
          price: Number(data.price),
          isActive: data.isActive,
        },
      }).unwrap();
      refetchProduct();
      alert("Detail produk berhasil diperbarui");
    } catch (err: any) {
      alert(err.data?.message || "Gagal memperbarui produk");
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || !ingredientQuantity) return;

    const currentItems = recipeData?.items || [];
    const updatedItems = [
      ...currentItems.map((item: any) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
      })),
      {
        materialId: selectedMaterialId,
        quantity: Number(ingredientQuantity),
      },
    ];

    try {
      await updateRecipe({ id: productId, body: { items: updatedItems } }).unwrap();
      refetchRecipe();
      setIsAddIngredientOpen(false);
      setSelectedMaterialId("");
      setIngredientQuantity("");
    } catch (err: any) {
      alert(err.data?.message || "Gagal memperbarui resep");
    }
  };

  const handleDeleteIngredient = async (materialId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus bahan ini dari resep?")) return;

    const currentItems = recipeData?.items || [];
    const updatedItems = currentItems
      .filter((item: any) => item.materialId !== materialId)
      .map((item: any) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
      }));

    try {
      await updateRecipe({ id: productId, body: { items: updatedItems } }).unwrap();
      refetchRecipe();
    } catch (err: any) {
      alert(err.data?.message || "Gagal menghapus bahan resep");
    }
  };

  // Profit calculations
  const sellingPrice = product.price ? Number(product.price) : 0;
  const recipeItems = recipeData?.items || [];

  const totalRecipeCost = recipeItems.reduce((sum: number, item: any) => {
    const activeVariants = item.material?.variants || [];
    const unitCosts = activeVariants
      .map((v: any) => (v.cost && v.quantityInBaseUnit ? Number(v.cost) / Number(v.quantityInBaseUnit) : 0))
      .filter((c: number) => c > 0);
    const unitCost = unitCosts.length > 0 ? Math.min(...unitCosts) : 0;
    return sum + Number(item.quantity) * unitCost;
  }, 0);

  const grossProfit = sellingPrice - totalRecipeCost;
  const grossMarginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => router.push("/products")}
            className="text-text-muted hover:text-text-primary transition text-sm font-medium self-start"
          >
            &larr; Kembali ke Daftar Produk
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-text-primary tracking-tight">{product.name}</h1>
            <StatusBadge isActive={product.isActive} />
          </div>
          <p className="text-xs text-text-muted">
            Tipe: <span className="font-semibold text-text-secondary">Produk Jadi</span>
          </p>
        </div>
      </div>

      <div className="flex border-b border-border/80 gap-2 mb-4">
        {(["overview", "recipe", "margin"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-4 text-sm font-medium border-b-2 transition ${
              activeTab === tab
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tab === "overview" ? "Informasi Umum" : tab === "recipe" ? "Resep" : "Margin & Cost"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit(handleUpdateProduct)} className="space-y-4">
            <Input
              label="Nama Produk Jadi *"
              {...register("name")}
              error={errors.name?.message}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Kategori *</label>
                <select
                  {...register("categoryId")}
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
                  {...register("brandId")}
                  className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
                >
                  <option value="">Tanpa Brand</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Harga Jual *"
              type="number"
              {...register("price", { valueAsNumber: true })}
              error={errors.price?.message}
              required
            />

            <div className="flex items-center gap-2 pt-2">
              <input
                id="isActive"
                type="checkbox"
                {...register("isActive")}
                className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-text-primary">
                Produk Aktif
              </label>
            </div>

            <div className="pt-4 border-t border-border/60 flex justify-end">
              <Button type="submit" disabled={isUpdatingProduct}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "recipe" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-text-primary">Komposisi Resep</h3>
            <Button onClick={() => setIsAddIngredientOpen(true)}>+ Tambah Bahan Baku</Button>
          </div>

          <DataTable
            headers={[
              "Bahan Baku",
              "Jumlah",
              "Satuan Dasar",
              "Estimasi Cost / Unit",
              "Estimasi Total Cost",
              <div className="text-right" key="aksi">Aksi</div>
            ]}
          >
            {recipeItems.map((item: any) => {
              const materialInfo = item.material;
              const activeVariants = materialInfo?.variants || [];
              const unitCosts = activeVariants
                .map((v: any) => (v.cost && v.quantityInBaseUnit ? Number(v.cost) / Number(v.quantityInBaseUnit) : 0))
                .filter((c: number) => c > 0);
              const unitCost = unitCosts.length > 0 ? Math.min(...unitCosts) : 0;
              const totalCost = Number(item.quantity) * unitCost;

              return (
                <tr key={item.id} className="hover:bg-surface-secondary/20 transition border-b border-border/50">
                  <td className="px-6 py-4 font-bold">{materialInfo?.name || "-"}</td>
                  <td className="px-6 py-4">{Number(item.quantity).toLocaleString()}</td>
                  <td className="px-6 py-4">{materialInfo?.baseUnit || "-"}</td>
                  <td className="px-6 py-4">Rp {unitCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {materialInfo?.baseUnit || "-"}</td>
                  <td className="px-6 py-4 font-semibold text-indigo-400">Rp {totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right">
                    <IconButton
                      variant="ghost"
                      icon={Trash2}
                      label="Hapus Bahan Baku"
                      className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => handleDeleteIngredient(item.materialId)}
                    />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </div>
      )}

      {activeTab === "margin" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Ringkasan Biaya & Pendapatan</h3>

            <div className="space-y-3 divide-y divide-border">
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>Harga Jual</span>
                <span className="font-bold text-text-primary">Rp {sellingPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>Total Biaya Resep</span>
                <span className="font-bold text-rose-500">Rp {totalRecipeCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>Keuntungan Kotor (Gross Profit)</span>
                <span className="font-bold text-green-500">Rp {grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>Margin Kotor (Gross Margin)</span>
                <span className={`font-bold ${grossMarginPercent >= 50 ? "text-green-500" : "text-amber-500"}`}>
                  {grossMarginPercent.toFixed(2)} %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Ingredient Modal */}
      <Modal isOpen={isAddIngredientOpen} onClose={() => setIsAddIngredientOpen(false)} title="Tambah Bahan Baku Resep">
        <form onSubmit={handleAddIngredient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Pilih Bahan Baku *</label>
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
            >
              <option value="">Pilih Bahan Baku...</option>
              {materials.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.baseUnit})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Jumlah / Takaran *"
            type="number"
            placeholder="e.g. 20"
            value={ingredientQuantity}
            onChange={(e) => setIngredientQuantity(e.target.value)}
            required
          />

          {selectedMaterialId && (
            <p className="text-xs text-text-muted mt-1">
              Satuan Dasar: <span className="font-semibold text-indigo-400">{materials.find((m: any) => m.id === selectedMaterialId)?.baseUnit}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddIngredientOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isUpdatingRecipe}>
              Tambah Bahan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
