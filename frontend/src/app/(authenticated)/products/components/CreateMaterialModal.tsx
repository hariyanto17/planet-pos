import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import {
  useGetBrandsQuery,
  useCreateBrandMutation,
  useCreateMaterialMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation
} from "@/lib/api/productApi";
import { useGetCategoriesQuery } from "@/lib/api/categoryApi";

const materialSchema = zod.object({
  name: zod.string().min(1, "Nama bahan baku wajib diisi"),
  categoryId: zod.string().min(1, "Kategori wajib diisi"),
  brandId: zod.string().optional(),
  baseUnit: zod.string().min(1, "Satuan dasar wajib diisi"),
  description: zod.string().optional(),
  hasVariant: zod.boolean().optional(),
  variantName: zod.string().optional(),
  sku: zod.string().optional(),
  barcode: zod.string().optional(),
  quantityInBaseUnit: zod.number().positive("Jumlah/Isi kemasan harus lebih besar dari 0").or(zod.nan()).optional(),
  purchasePrice: zod.number().positive("Harga beli paket harus lebih besar dari 0").or(zod.nan()).optional(),
  supplierId: zod.string().optional(),
}).superRefine((data, ctx) => {
  if (data.hasVariant) {
    if (!data.variantName) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ["variantName"],
        message: "Nama varian wajib diisi",
      });
    }
    if (data.quantityInBaseUnit === undefined || isNaN(data.quantityInBaseUnit)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ["quantityInBaseUnit"],
        message: "Isi kemasan wajib diisi",
      });
    }
    if (data.purchasePrice === undefined || isNaN(data.purchasePrice)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ["purchasePrice"],
        message: "Harga beli paket wajib diisi",
      });
    }
  }
});

type MaterialFormInput = zod.infer<typeof materialSchema>;

interface CreateMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMaterialModal: React.FC<CreateMaterialModalProps> = ({ isOpen, onClose }) => {
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [], refetch: refetchBrands } = useGetBrandsQuery();
  const { data: suppliers = [], refetch: refetchSuppliers } = useGetSuppliersQuery();
  const [createBrand] = useCreateBrandMutation();
  const [createSupplier] = useCreateSupplierMutation();
  const [createMaterial] = useCreateMaterialMutation();

  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandError, setBrandError] = useState("");

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [supplierError, setSupplierError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormInput>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      hasVariant: false,
      baseUnit: "",
    },
  });

  const hasVariant = watch("hasVariant", false);

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      setBrandError("Nama brand wajib diisi");
      return;
    }
    try {
      const brand = await createBrand({ name: newBrandName.trim() }).unwrap();
      await refetchBrands();
      setValue("brandId", brand.id);
      setIsAddBrandOpen(false);
      setNewBrandName("");
      setBrandError("");
    } catch (err: any) {
      setBrandError(err.data?.message || "Gagal membuat brand");
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      setSupplierError("Nama supplier wajib diisi");
      return;
    }
    try {
      const supplier = await createSupplier({ name: newSupplierName.trim() }).unwrap();
      await refetchSuppliers();
      setValue("supplierId", supplier.id);
      setIsAddSupplierOpen(false);
      setNewSupplierName("");
      setSupplierError("");
    } catch (err: any) {
      setSupplierError(err.data?.message || "Gagal membuat supplier");
    }
  };

  const onSubmit = async (data: MaterialFormInput) => {
    try {
      const payload: any = {
        name: data.name,
        categoryId: data.categoryId,
        baseUnit: data.baseUnit,
        brandId: data.brandId || null,
        description: data.description || null,
      };

      if (data.hasVariant) {
        payload.variant = {
          name: data.variantName,
          sku: data.sku || null,
          barcode: data.barcode || null,
          quantityInBaseUnit: data.quantityInBaseUnit,
          purchasePrice: data.purchasePrice,
          supplierId: data.supplierId || null,
        };
      }

      await createMaterial(payload).unwrap();
      reset();
      onClose();
    } catch (err: any) {
      alert(err.data?.message || "Gagal membuat bahan baku");
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Tambah Bahan Baku Baru">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nama Bahan Baku"
            placeholder="Masukkan nama bahan baku (e.g. Creamer, Susu UHT)"
            {...register("name")}
            error={errors.name?.message}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategori *
              </label>
              <select
                {...register("categoryId")}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-xs text-red-500">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Satuan Dasar *
              </label>
              <select
                {...register("baseUnit")}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Pilih Satuan</option>
                <option value="ML">Milliliter (ML)</option>
                <option value="G">Gram (G)</option>
                <option value="PCS">Piece (PCS)</option>
              </select>
              {errors.baseUnit && (
                <p className="mt-1 text-xs text-red-500">{errors.baseUnit.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Brand (Opsional)
            </label>
            <div className="flex gap-2">
              <select
                {...register("brandId")}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Pilih Brand</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={() => setIsAddBrandOpen(true)}>
                +
              </Button>
            </div>
          </div>


          <Input
            label="Deskripsi (Opsional)"
            placeholder="Masukkan keterangan tambahan..."
            {...register("description")}
            error={errors.description?.message}
          />

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
              <input type="checkbox" {...register("hasVariant")} className="rounded border-gray-300" />
              Buat Varian Sekarang (Opsional)
            </label>

            {hasVariant && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
                <Input
                  label="Nama Varian *"
                  placeholder="e.g. 500g, 1L, Dus Besar"
                  {...register("variantName")}
                  error={errors.variantName?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="SKU Varian (Opsional)"
                    placeholder="e.g. CRM-500"
                    {...register("sku")}
                    error={errors.sku?.message}
                  />
                  <Input
                    label="Barcode Varian (Opsional)"
                    placeholder="Masukkan barcode"
                    {...register("barcode")}
                    error={errors.barcode?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Isi per Varian *"
                    type="number"
                    placeholder="e.g. 500"
                    {...register("quantityInBaseUnit", { valueAsNumber: true })}
                    error={errors.quantityInBaseUnit?.message}
                  />

                  <Input
                    label="Harga Paket *"
                    type="number"
                    placeholder="e.g. 50000"
                    {...register("purchasePrice", { valueAsNumber: true })}
                    error={errors.purchasePrice?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier Utama (Opsional)
                  </label>
                  <div className="flex gap-2">
                    <select
                      {...register("supplierId")}
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Pilih Supplier</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="secondary" onClick={() => setIsAddSupplierOpen(true)}>
                      + Supplier
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Bahan Baku"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddBrandOpen} onClose={() => setIsAddBrandOpen(false)} title="Tambah Brand Baru">
        <div className="space-y-4">
          <Input
            label="Nama Brand"
            placeholder="e.g. Ultra Milk, Indomilk"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            error={brandError}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddBrandOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddBrand}>Simpan Brand</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddSupplierOpen} onClose={() => setIsAddSupplierOpen(false)} title="Tambah Supplier Baru">
        <div className="space-y-4">
          <Input
            label="Nama Supplier"
            placeholder="e.g. PT Jaya Makmur, CV Sejahtera"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            error={supplierError}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddSupplierOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddSupplier}>Simpan Supplier</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
