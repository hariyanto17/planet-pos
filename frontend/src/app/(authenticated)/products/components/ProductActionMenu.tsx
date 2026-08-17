import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Edit, ClipboardList, ToggleLeft, ToggleRight, Trash2, Eye } from "lucide-react";
import { Product } from "../page";

interface ProductActionMenuProps {
  product: Product;
  onEdit: (product: Product) => void;
  onRecipe: (productId: string) => void;
  onToggleActive: (product: Product) => void;
  onDelete: (product: Product) => void;
  onDetail: (product: Product) => void;
}

export const ProductActionMenu: React.FC<ProductActionMenuProps> = ({
  product,
  onEdit,
  onRecipe,
  onToggleActive,
  onDelete,
  onDetail,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

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

  const handleAction = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label="Product actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="p-2 hover:bg-zinc-800 rounded-lg text-text-secondary hover:text-text-primary transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 rounded-xl bg-surface-secondary border border-border/80 shadow-2xl z-50 py-1.5 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-100">
          <button
            type="button"
            onClick={(e) => handleAction(e, () => onDetail(product))}
            className="w-full px-4 py-2.5 text-sm text-text-primary hover:bg-surface/60 hover:text-white flex items-center gap-2.5 transition text-left"
          >
            <Eye className="w-4 h-4 text-text-secondary" />
            <span>Detail</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onEdit(product))}
            className="w-full px-4 py-2.5 text-sm text-text-primary hover:bg-surface/60 hover:text-white flex items-center gap-2.5 transition text-left"
          >
            <Edit className="w-4 h-4 text-text-secondary" />
            <span>Ubah</span>
          </button>

          {product.inventoryType === "FINISHED_GOOD" && (
            <button
              type="button"
              onClick={(e) => handleAction(e, () => onRecipe(product.id))}
              className="w-full px-4 py-2 text-sm text-text-primary hover:bg-surface/60 hover:text-white flex items-center gap-2.5 transition text-left"
            >
              <ClipboardList className="w-4 h-4 text-text-secondary" />
              <div className="flex flex-col items-start leading-tight">
                <span>Resep</span>
                <span className="text-[9px] text-text-muted font-normal mt-0.5">
                  {product.recipe && product.recipe.items && product.recipe.items.length > 0
                    ? "Sudah Diatur"
                    : "Belum Ada"}
                </span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onToggleActive(product))}
            className="w-full px-4 py-2.5 text-sm text-text-primary hover:bg-surface/60 hover:text-white flex items-center gap-2.5 transition text-left"
          >
            {product.isActive ? (
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

          <div className="border-t border-border/80 my-1"></div>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onDelete(product))}
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

export default ProductActionMenu;
