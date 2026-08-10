import React, { useState } from "react";
import { Button } from "@/components/Button";
import { TEXT } from "@/lib/i18n/id";

interface OpeningCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (openingCash: number) => Promise<void>;
}

export const OpeningCashModal: React.FC<OpeningCashModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [openingCash, setOpeningCash] = useState<string>("500000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const amount = Number(openingCash);
      if (isNaN(amount) || amount < 0) {
        throw new Error("Kas awal laci harus berupa angka positif yang valid");
      }
      await onSubmit(amount);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Gagal membuka shift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-xl animate-scale-in">
        <div className="flex flex-col gap-1">
          <h3 className="text-text-primary text-lg font-black tracking-tight">{TEXT.shifts.openShiftModalTitle}</h3>
          <p className="text-text-muted text-xs font-medium">
            {TEXT.shifts.openShiftModalDesc}
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">
              {TEXT.shifts.startingCashLabel} (Rp)
            </label>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              required
              className="px-4 py-2.5 bg-surface-secondary border border-border rounded-xl text-text-primary font-bold text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {error && (
            <span className="text-red-400 text-xs font-semibold bg-red-950/20 px-3 py-2 border border-red-900/30 rounded-xl">
              {error}
            </span>
          )}

          <div className="flex justify-end gap-2.5 mt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              {TEXT.common.cancel}
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Buka Shift
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default OpeningCashModal;
