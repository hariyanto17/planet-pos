import React, { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  useGetProductRecipeQuery,
  useUpdateProductRecipeMutation,
} from "@/lib/api/productApi";
import { getAvailableUnits, getDefaultUnit } from "@/lib/utils/unitConversions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  allProducts: any[];
}

export const RecipeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  productId,
  allProducts = [],
}) => {
  const { data: recipe, isLoading: isLoadingRecipe } = useGetProductRecipeQuery(productId, {
    skip: !productId || !isOpen,
  });
  const [updateRecipe, { isLoading: isSaving }] = useUpdateProductRecipeMutation();

  const [items, setItems] = useState<Array<{ materialVariantId: string; quantity: string }>>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const ingredientOptions = allProducts.filter(
    (p) =>
      p.id !== productId &&
      p.isActive &&
      p.trackInventory &&
      (p.inventoryType === "RAW_MATERIAL" || p.inventoryType === "PACKAGING")
  );

  useEffect(() => {
    if (recipe && recipe.items) {
      setItems(
        recipe.items.map((it: any) => ({
          materialVariantId: it.materialVariantId ?? it.componentProductId ?? it.id ?? "",
          quantity: Number(it.quantity).toString(),
        }))
      );
    } else {
      setItems([]);
    }
    setErrorMsg("");
    setSuccessMsg("");
  }, [recipe, isOpen]);

  const handleAddRow = () => {
    setItems((prev) => [...prev, { materialVariantId: "", quantity: "1" }]);
  };

  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: string, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Validate
    if (items.length === 0) {
      setErrorMsg("Resep harus memiliki minimal 1 bahan komponen.");
      return;
    }

    const seen = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.materialVariantId) {
        setErrorMsg(`Baris ke-${i + 1}: Silakan pilih bahan komponen.`);
        return;
      }
      const qtyNum = parseFloat(it.quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setErrorMsg(`Baris ke-${i + 1}: Jumlah bahan harus positif.`);
        return;
      }
      if (seen.has(it.materialVariantId)) {
        setErrorMsg(`Baris ke-${i + 1}: Bahan duplikat terdeteksi.`);
        return;
      }
      seen.add(it.materialVariantId);
    }

    try {
      await updateRecipe({
        id: productId,
        body: {
          items: items.map((it) => ({
            materialVariantId: it.materialVariantId,
            quantity: parseFloat(it.quantity),
          })),
        },
      }).unwrap();
      setSuccessMsg("Resep berhasil disimpan!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal menyimpan resep.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kelola Resep / BOM">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-emerald-400 text-xs font-semibold">
            ✓ {successMsg}
          </div>
        )}

        {isLoadingRecipe ? (
          <div className="text-center py-6 text-text-muted text-sm font-medium">Memuat data resep...</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="max-h-[300px] overflow-y-auto border border-border/80 rounded-lg bg-surface-secondary/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/50 text-[10px] uppercase tracking-wider text-text-secondary font-bold">
                    <th className="px-4 py-2">Bahan Komponen</th>
                    <th className="px-4 py-2 w-28">Jumlah</th>
                    <th className="px-4 py-2 w-24">Satuan</th>
                    <th className="px-4 py-2 w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => {
                    const selectedComp = ingredientOptions.find((p) => (p.materialVariantId ?? p.id) === row.materialVariantId);
                    const unitSymbol = selectedComp?.unit?.symbol || selectedComp?.baseUnit || "PCS";

                    return (
                      <tr key={idx} className="border-b border-border hover:bg-surface/10">
                        <td className="px-3 py-2">
                          <select
                            value={row.materialVariantId}
                            onChange={(e) => handleRowChange(idx, "materialVariantId", e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface-secondary border border-border rounded text-text-primary outline-none focus:border-indigo-500 text-xs font-semibold"
                            required
                          >
                            <option value="">Pilih Bahan...</option>
                            {ingredientOptions.map((p) => {
                              const optionId = p.materialVariantId ?? p.id;
                              return (
                                <option key={optionId} value={optionId}>
                                  {p.name} ({p.sku || "-"})
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                            required
                            className="w-full text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-text-secondary font-semibold px-2 py-1 bg-surface/80 border border-border rounded inline-block w-full text-center">
                            {unitSymbol}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-rose-500 hover:text-rose-400 text-xs font-bold transition"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-text-muted text-xs">
                        Belum ada bahan. Klik &quot;Tambah Bahan&quot; di bawah.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleAddRow}
              className="text-xs font-bold border border-dashed border-border hover:border-border w-full"
            >
              + Tambah Bahan Komponen
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border/80 pt-4 mt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Batal
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            Simpan Resep
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RecipeModal;
