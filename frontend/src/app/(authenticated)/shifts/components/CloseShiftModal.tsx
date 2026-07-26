import React, { useState } from "react";
import { Button } from "@/components/Button";

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actualCash: number, notes?: string) => Promise<void>;
  expectedCash: number;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  expectedCash,
}) => {
  const [actualCash, setActualCash] = useState<string>(String(expectedCash));
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const amount = Number(actualCash);
      if (isNaN(amount) || amount < 0) {
        throw new Error("Actual cash counted must be a valid positive number");
      }
      await onSubmit(amount, notes);
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Failed to close shift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-xl animate-scale-in">
        <div className="flex flex-col gap-1">
          <h3 className="text-zinc-100 text-lg font-black tracking-tight">Close Cashier Drawer Shift</h3>
          <p className="text-zinc-500 text-xs font-medium">
            After closing, you will not be able to process new transactions on this shift.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
              Actual Cash Drawer Count (Rp)
            </label>
            <input
              type="number"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              required
              className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-bold text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
              Shift Closing Notes / Discrepancy explanation
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cash balanced or difference explanation..."
              className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {error && (
            <span className="text-red-400 text-xs font-semibold bg-red-950/20 px-3 py-2 border border-red-900/30 rounded-xl">
              {error}
            </span>
          )}

          <div className="flex justify-end gap-2.5 mt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Close Shift
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CloseShiftModal;
