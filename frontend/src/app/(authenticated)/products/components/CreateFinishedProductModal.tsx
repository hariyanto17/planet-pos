import React, { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { PriceInput } from "@/components/PriceInput";
import { Controller } from "react-hook-form";
import {
  useGetBrandsQuery,
  useCreateProductMutation,
  useGetMaterialsQuery,
  useGetMaterialVariantsQuery,
} from "@/lib/api/productApi";
import { useGetCategoriesQuery } from "@/lib/api/categoryApi";

const finishedProductSchema = zod.object({
  name: zod.string().min(1, "Nama produk wajib diisi"),
  categoryId: zod.string().min(1, "Kategori wajib diisi"),
  brandId: zod.string().optional(),
  sku: zod.string().optional(),
  barcode: zod.string().optional(),
  price: zod.number().positive("Harga jual harus lebih besar dari 0").or(zod.nan()).optional(),
  productType: zod.enum(["DIRECT_SALE", "RECIPE_BASED"]),
  directSaleMaterialVariantId: zod.string().optional(),
  recipe: zod.object({
    items: zod.array(zod.object({
      materialId: zod.string().min(1, "Bahan baku wajib dipilih"),
      quantity: zod.number().positive("Jumlah harus lebih besar dari 0"),
      note: zod.string().optional(),
    })).optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.productType === "DIRECT_SALE") {
    if (data.price === undefined || isNaN(data.price)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ["price"],
        message: "Harga jual wajib diisi untuk penjualan langsung",
      });
    }
  }
});

type FinishedProductFormInput = zod.infer<typeof finishedProductSchema>;

interface CreateFinishedProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateFinishedProductModal: React.FC<CreateFinishedProductModalProps> = ({ isOpen, onClose }) => {
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: materials = [] } = useGetMaterialsQuery();
  const { data: variants = [] } = useGetMaterialVariantsQuery();
  const [createProduct] = useCreateProductMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FinishedProductFormInput>({
    resolver: zodResolver(finishedProductSchema),
    defaultValues: {
      productType: "DIRECT_SALE",
      recipe: {
        items: [],
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipe.items",
  });

  const productType = watch("productType");
  const watchRecipeItems = watch("recipe.items") || [];

  const materialMap = useMemo(() => {
    const map = new Map<string, any>();
    materials.forEach((m: any) => {
      map.set(m.id, m);
    });
    return map;
  }, [materials]);

  const onSubmit = async (data: FinishedProductFormInput) => {
    try {
      const payload: any = {
        name: data.name,
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        sku: data.sku || null,
        barcode: data.barcode || null,
        price: data.price && !isNaN(data.price) ? data.price : null,
        productType: data.productType,
        directSaleMaterialVariantId: data.directSaleMaterialVariantId || null,
        isActive: true,
      };

      if (data.productType === "RECIPE_BASED" && data.recipe && data.recipe.items && data.recipe.items.length > 0) {
        payload.recipe = {
          items: data.recipe.items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            note: item.note || null,
          })),
        };
      }

      await createProduct(payload).unwrap();
      reset();
      onClose();
    } catch (err: any) {
      alert(err.data?.message || "Gagal membuat produk");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Produk Jadi Baru">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nama Produk"
          placeholder="e.g. Chicken Rice, Sweet Tea"
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
              <option value="">Pilih Kategori</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-rose-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Brand</label>
            <select
              {...register("brandId")}
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
          <Input
            label="SKU (Opsional)"
            placeholder="e.g. F&B-RCE-CHIK"
            {...register("sku")}
          />
          <Input
            label="Barcode (Opsional)"
            placeholder="e.g. 899..."
            {...register("barcode")}
          />
        </div>

        <div className="flex gap-4 p-3 bg-zinc-800/20 rounded-md border border-border">
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
            <input
              type="radio"
              value="DIRECT_SALE"
              {...register("productType")}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            Jual Langsung (Direct Sale)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
            <input
              type="radio"
              value="RECIPE_BASED"
              {...register("productType")}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            Berdasarkan Resep (Recipe-Based)
          </label>
        </div>

        {productType === "DIRECT_SALE" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <PriceInput
                  label="Harga Jual *"
                  placeholder="e.g. 15000"
                  error={errors.price?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Link ke Varian Bahan Baku (Untuk Pengurangan Stok)
              </label>
              <select
                {...register("directSaleMaterialVariantId")}
                className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
              >
                <option value="">Pilih Varian Bahan...</option>
                {variants.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.materialName} - {v.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-muted mt-1">
                Opsional. Saat produk ini terjual, stok varian terpilih akan berkurang 1 unit.
              </p>
            </div>
          </div>
        )}

        {productType === "RECIPE_BASED" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-text-primary">Komposisi Resep</h4>
              <Button type="button" onClick={() => append({ materialId: "", quantity: 1, note: "" })}>
                + Tambah Bahan
              </Button>
            </div>

            {fields.map((field, index) => {
              const selectedMatId = watchRecipeItems[index]?.materialId;
              const selectedMat = selectedMatId ? materialMap.get(selectedMatId) : null;
              const baseUnit = selectedMat ? selectedMat.baseUnit : "";

              return (
                <div key={field.id} className="flex gap-2 items-end bg-gray-50 dark:bg-zinc-800/40 p-3 rounded-md border border-border">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Bahan Baku *</label>
                    <select
                      {...register(`recipe.items.${index}.materialId`)}
                      className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500"
                    >
                      <option value="">Pilih Bahan</option>
                      {materials.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Jumlah *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        {...register(`recipe.items.${index}.quantity`, { valueAsNumber: true })}
                        className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text-primary outline-none focus:border-indigo-500 pr-8"
                      />
                      {baseUnit && (
                        <span className="absolute right-2 top-2.5 text-xs font-bold text-indigo-400">
                          {baseUnit}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Catatan</label>
                    <Input
                      placeholder="e.g. Diiris tipis"
                      {...register(`recipe.items.${index}.note`)}
                    />
                  </div>

                  <Button type="button" variant="danger" onClick={() => remove(index)}>
                    Hapus
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Tambah Produk Jadi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
