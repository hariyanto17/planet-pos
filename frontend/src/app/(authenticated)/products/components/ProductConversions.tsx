import React, { useState, useEffect } from "react";
import { Product, ProductUnitConversion } from "@/lib/utils/unitConversions";
import { Button } from "@/components/Button";

interface Props {
  product: Product;
  onSave: (conversions: ProductUnitConversion[]) => void;
  isLoading?: boolean;
}

export const ProductConversions: React.FC<Props> = ({ product, onSave, isLoading }) => {
  const [conversions, setConversions] = useState(product.unitConversions || []);
  const [newUnit, setNewUnit] = useState("");
  const [newBaseQuantity, setNewBaseQuantity] = useState("");

  useEffect(() => {
    setConversions(product.unitConversions || []);
  }, [product.id, product.unitConversions]);

  const handleAdd = () => {
    if (!newUnit.trim() || !newBaseQuantity.trim()) return;
    const exists = conversions.some((c) => c.unit.toLowerCase() === newUnit.trim().toLowerCase());
    if (exists) return;

    const updated: ProductUnitConversion[] = [...conversions, {
      unit: newUnit.trim().toUpperCase(),
      baseQuantity: Number(newBaseQuantity),
      isDefault: conversions.length === 0,
    }];
    setConversions(updated);
    onSave(updated);
    setNewUnit("");
    setNewBaseQuantity("");
  };

  const handleRemove = (unit: string) => {
    const updated = conversions.filter((c) => c.unit !== unit);
    if (updated.length > 0 && !updated.some((c) => c.isDefault)) {
      updated[0].isDefault = true;
    }
    setConversions(updated);
    onSave(updated);
  };

  const handleSetDefault = (unit: string) => {
    const updated = conversions.map((c) => ({
      ...c,
      isDefault: c.unit === unit,
    }));
    setConversions(updated);
    onSave(updated);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">
        Packaging Conversions
      </div>

      {product.baseUnit && (
        <div className="text-xs text-text-muted">
          Base Unit: <span className="font-bold text-text-primary">{product.baseUnit}</span>
        </div>
      )}

      {conversions.length === 0 ? (
        <div className="text-xs text-text-muted py-2">
          No packaging conversions configured. Add one below.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversions.map((conversion) => (
            <div
              key={conversion.unit}
              className="flex items-center justify-between gap-2 p-2 bg-surface-secondary border border-border rounded-lg"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary">
                  {conversion.unit}
                </span>
                <span className="text-[10px] text-text-muted">
                  1 {conversion.unit} = {Number(conversion.baseQuantity).toLocaleString("id-ID")} {product.baseUnit}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!conversion.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(conversion.unit)}
                    className="px-2 py-1 text-[10px] font-bold text-indigo-400 border border-indigo-500/40 rounded hover:bg-indigo-500/10 transition"
                  >
                    Set Default
                  </button>
                )}
                {conversion.isDefault && (
                  <span className="px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/40 rounded bg-emerald-500/10">
                    Default
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(conversion.unit)}
                  className="px-2 py-1 text-[10px] font-bold text-rose-400 border border-rose-500/40 rounded hover:bg-rose-500/10 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-bold text-text-muted uppercase">Unit</label>
          <input
            type="text"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="e.g. DOS"
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-xs outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-bold text-text-muted uppercase">
            Qty in {product.baseUnit}
          </label>
          <input
            type="number"
            step="0.001"
            value={newBaseQuantity}
            onChange={(e) => setNewBaseQuantity(e.target.value)}
            placeholder="e.g. 5000"
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-xs outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleAdd}
            disabled={!newUnit.trim() || !newBaseQuantity.trim() || isLoading}
            className="text-xs"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};
