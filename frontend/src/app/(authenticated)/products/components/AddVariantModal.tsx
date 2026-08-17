import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useGetSuppliersQuery, useCreateMaterialVariantMutation } from "@/lib/api/productApi";
import { PriceInput } from "@/components/PriceInput";
import { Select } from "@/components/Select";
import { Controller } from "react-hook-form";

const variantSchema = zod.object({
  name: zod.string().min(1, "Nama varian wajib diisi"),
  quantityInBaseUnit: zod.number().positive("Jumlah/Isi kemasan harus lebih besar dari 0").or(zod.nan()),
  purchasePrice: zod.number().min(0, "Harga beli tidak boleh negatif").or(zod.nan()),
  sku: zod.string().optional(),
  barcode: zod.string().optional(),
  supplierId: zod.string().optional(),
});

type VariantFormInput = zod.infer<typeof variantSchema>;

interface AddVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: { id: string; name: string; baseUnit?: string } | null;
}

export const AddVariantModal: React.FC<AddVariantModalProps> = ({ isOpen, onClose, material }) => {
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createMaterialVariant, { isLoading }] = useCreateMaterialVariantMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<VariantFormInput>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: "",
      quantityInBaseUnit: undefined,
      purchasePrice: undefined,
      sku: "",
      barcode: "",
      supplierId: "",
    },
  });

  const quantity = watch("quantityInBaseUnit");
  const price = watch("purchasePrice");

  const estimatedCost =
    quantity && price && !isNaN(quantity) && !isNaN(price) && quantity > 0
      ? Math.round(price / quantity)
      : null;

  const onSubmit = async (data: VariantFormInput) => {
    if (!material) return;
    try {
      await createMaterialVariant({
        materialId: material.id,
        body: {
          name: data.name,
          sku: data.sku || undefined,
          barcode: data.barcode || undefined,
          quantityInBaseUnit: Number(data.quantityInBaseUnit),
          purchasePrice: Number(data.purchasePrice),
          supplierId: data.supplierId || undefined,
        },
      }).unwrap();
      reset();
      onClose();
    } catch (err: any) {
      alert(err.data?.message || "Gagal menambahkan varian");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Varian Bahan Baku">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Material
            </label>
            <div className="text-lg font-bold text-text-primary mt-0.5">
              {material?.name || "-"}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Satuan Dasar
            </label>
            <div className="text-lg font-bold text-text-primary mt-0.5">
              {material?.baseUnit || "-"}
            </div>
          </div>
        </div>

        <Input
          id="variantName"
          label="Nama Varian *"
          placeholder="e.g. 500g, 1kg, 2L"
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="quantityInBaseUnit"
            label="Jumlah / Isi Kemasan *"
            type="number"
            placeholder="e.g. 500, 1000"
            error={errors.quantityInBaseUnit?.message}
            {...register("quantityInBaseUnit", { valueAsNumber: true })}
          />

          <Controller
            control={control}
            name="purchasePrice"
            render={({ field }) => (
              <PriceInput
                id="purchasePrice"
                label="Harga Beli Paket *"
                placeholder="e.g. 50000"
                error={errors.purchasePrice?.message}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {estimatedCost !== null && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-400 font-medium">
            Estimasi Harga per Satuan Dasar: Rp {estimatedCost.toLocaleString()} / {material?.baseUnit || "Unit"}
          </div>
        )}

        <Select
          id="supplierId"
          label="Supplier (Opsional)"
          error={errors.supplierId?.message}
          {...register("supplierId")}
        >
          <option value="">Pilih Supplier...</option>
          {suppliers.map((supplier: any) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="sku"
            label="SKU (Opsional)"
            placeholder="e.g. CRM-1KG"
            error={errors.sku?.message}
            {...register("sku")}
          />

          <Input
            id="barcode"
            label="Barcode (Opsional)"
            placeholder="e.g. 8991234567890"
            error={errors.barcode?.message}
            {...register("barcode")}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button" disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Tambah Varian"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
