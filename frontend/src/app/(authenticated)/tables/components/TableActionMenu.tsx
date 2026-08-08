import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Edit, QrCode, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { authCookie } from "@/utils/authCookie";

interface Table {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

interface TableActionMenuProps {
  table: Table;
  onEdit: (table: Table) => void;
  onToggleActive: (table: Table) => void;
  onDelete: (tableId: string) => void;
}

export const TableActionMenu: React.FC<TableActionMenuProps> = ({
  table,
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  const handleDownloadQr = async () => {
    setIsOpen(false);
    setIsDownloading(true);
    try {
      const token = authCookie.getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
      const response = await fetch(`${apiUrl}/tables/${table.id}/qrcode`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download QR code");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `table-${table.code.replace(/[^a-zA-Z0-9]/g, "_")}-qr.png`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh kode QR.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label="Table actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
        disabled={isDownloading}
        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-2xl z-50 py-1.5 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-100">
          <button
            type="button"
            onClick={() => handleAction(() => onEdit(table))}
            className="w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900/60 hover:text-white flex items-center gap-2.5 transition text-left"
          >
            <Edit className="w-4 h-4 text-zinc-400" />
            <span>Ubah</span>
          </button>

          {table.isActive && (
            <button
              type="button"
              onClick={handleDownloadQr}
              className="w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900/60 hover:text-white flex items-center gap-2.5 transition text-left"
            >
              <QrCode className="w-4 h-4 text-zinc-400" />
              <span>Unduh Kode QR</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAction(() => onToggleActive(table))}
            className="w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900/60 hover:text-white flex items-center gap-2.5 transition text-left"
          >
            {table.isActive ? (
              <>
                <ToggleLeft className="w-4 h-4 text-amber-500" />
                <span>Nonaktifkan</span>
              </>
            ) : (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-500" />
                <span>Aktifkan</span>
              </>
            )}
          </button>

          <div className="border-t border-zinc-800/80 my-1"></div>

          <button
            type="button"
            onClick={() => handleAction(() => onDelete(table.id))}
            className="w-full px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 flex items-center gap-2.5 transition text-left font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus</span>
          </button>
        </div>
      )}
    </div>
  );
};
