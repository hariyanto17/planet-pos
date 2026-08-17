"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import Link from "next/link";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateMaterialMutation,
} from "@/lib/api/productApi";
import { useGetCategoriesQuery } from "@/lib/api/categoryApi";
import { useGetUnitsQuery } from "@/lib/api/inventoryApi";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { TEXT } from "@/lib/i18n/id";
import { RecipeModal } from "./components/RecipeModal";
import { ProductActionMenu } from "./components/ProductActionMenu";
import { ProductConversions } from "./components/ProductConversions";
import { CreateMaterialModal } from "./components/CreateMaterialModal";
import { CreateFinishedProductModal } from "./components/CreateFinishedProductModal";

const productSchema = zod
  .object({
    name: zod.string().min(1, "Product Name is required"),
    sku: zod.string().optional(),
    categoryId: zod.string().min(1, "Category is required"),
    price: zod.number().positive("Price must be greater than zero").or(zod.nan()).optional(),
    cost: zod.number().positive("Cost must be greater than zero").or(zod.nan()).optional(),
    imageUrl: zod.string().url("Must be a valid URL").or(zod.string().length(0)).optional(),
    trackInventory: zod.boolean().optional(),
    inventoryType: zod.string().optional(),
    minimumStock: zod
      .number()
      .min(0, "Low Stock Alert cannot be negative")
      .or(zod.nan())
      .optional(),
    unitId: zod.string().optional(),
    baseUnit: zod.string().optional(),
  })
  .superRefine((data, ctx) => {
    const type = data.inventoryType || "FINISHED_GOOD";
    if (!data.trackInventory || type === "FINISHED_GOOD") {
      if (data.price === undefined || isNaN(data.price)) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["price"],
          message: "Selling Price is required for Finished Goods",
        });
      }
    }
    if (data.trackInventory) {
      if (!data.inventoryType) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["inventoryType"],
          message: "Product Type is required when tracking stock & inventory",
        });
      }
      if (!data.baseUnit) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["baseUnit"],
          message: "Base Unit is required when tracking stock & inventory",
        });
      }
    }
  });

type ProductSchemaInput = zod.infer<typeof productSchema>;

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  price: string | null;
  cost?: string | null;
  imageUrl: string | null;
  isActive: boolean;
  productType?: "DIRECT_SALE" | "RECIPE_BASED";
  directSaleMaterialVariantId?: string | null;
  availableStock?: number | null;
  trackInventory?: boolean;
  inventoryType?: string | null;
  minimumStock?: number | null;
  unitId?: string | null;
  baseUnit?: string | null;
  unitConversions?: Array<{ id?: string; unit: string; baseQuantity: number | string; isDefault?: boolean }>;
  category?: {
    name: string;
  };
  unit?: {
    name: string;
    symbol: string;
  } | null;
  recipe?: {
    id: string;
    items: Array<{
      id: string;
      materialVariantId: string;
      quantity: string | number;
      materialVariant?: {
        id?: string;
        name?: string;
        baseUnit?: string;
      };
    }>;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

const LiveImagePreview = ({ url }: { url?: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!url) return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      <span className="text-xs font-medium text-text-secondary">Live Preview:</span>
      <div className="w-28 h-28 rounded-lg border border-border overflow-hidden bg-surface flex items-center justify-center">
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface text-text-muted text-center p-2">
            <svg className="w-8 h-8 text-zinc-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-text-muted font-medium">Invalid Image</span>
          </div>
        ) : (
          <img
            src={url}
            alt="Product Preview"
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        )}
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const router = useRouter();
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const { data: units = [], isLoading: isLoadingUnits } = useGetUnitsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [updateMaterial] = useUpdateMaterialMutation();

  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [selectedInventoryTypeFilter, setSelectedInventoryTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedRecipeProductId, setSelectedRecipeProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddFinishedProductOpen, setIsAddFinishedProductOpen] = useState(false);
  const [selectedDetailMaterialId, setSelectedDetailMaterialId] = useState<string | null>(null);
  const [selectedDetailProductId, setSelectedDetailProductId] = useState<string | null>(null);
  const [productConversions, setProductConversions] = useState<Array<{ id?: string; unit: string; baseQuantity: number | string; isDefault?: boolean }>>([]);

  const pageSize = 8;

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
    watch: watchEdit,
    setValue: setValueEdit,
  } = useForm<ProductSchemaInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      trackInventory: false,
      minimumStock: 0,
      inventoryType: "",
      unitId: "",
      baseUnit: "",
    },
  });

  const imageUrlEdit = watchEdit("imageUrl");
  const trackInventoryEdit = watchEdit("trackInventory", false);
  const inventoryTypeEdit = watchEdit("inventoryType");

  React.useEffect(() => {
    if (trackInventoryEdit && (inventoryTypeEdit === "RAW_MATERIAL" || inventoryTypeEdit === "PACKAGING")) {
      setValueEdit("price", undefined as any);
    }
  }, [trackInventoryEdit, inventoryTypeEdit, setValueEdit]);

  const activeUnits = useMemo(() => {
    return units.filter((u: any) => u.isActive);
  }, [units]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategoryFilter === "" || p.categoryId === selectedCategoryFilter;
      const matchesInventoryType = selectedInventoryTypeFilter === "" || p.inventoryType === selectedInventoryTypeFilter;
      return matchesSearch && matchesCategory && matchesInventoryType;
    });
  }, [products, search, selectedCategoryFilter, selectedInventoryTypeFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));


  const handleEdit = async (data: ProductSchemaInput) => {
    if (!editingProduct) return;
    try {
      const isFinishedGood = !data.trackInventory || data.inventoryType === "FINISHED_GOOD";

      if (data.trackInventory && (data.inventoryType === "RAW_MATERIAL" || data.inventoryType === "PACKAGING")) {
        await updateMaterial({
          id: editingProduct.id,
          name: data.name,
          categoryId: data.categoryId,
          isActive: editingProduct.isActive,
          variant: {
            sku: data.sku || undefined,
            baseUnit: data.baseUnit,
            variantQuantity: 1,
            purchasePrice: isNaN(data.cost as any) ? undefined : data.cost,
          }
        }).unwrap();
      } else {
        // Auto-populate unitId from baseUnit for backward compatibility
        let autoUnitId: string | undefined = undefined;
        if (data.trackInventory && data.baseUnit) {
          const baseUnitRecord = activeUnits.find((u: any) => u.symbol === data.baseUnit);
          autoUnitId = baseUnitRecord?.id;
        }

        await updateProduct({
          id: editingProduct.id,
          body: {
            categoryId: data.categoryId,
            sku: data.sku || undefined,
            name: data.name,
            price: isFinishedGood ? (isNaN(data.price as any) ? null : data.price) : null,
            imageUrl: data.imageUrl || undefined,
            trackInventory: data.trackInventory || false,
            inventoryType: data.trackInventory ? (data.inventoryType as any) : undefined,
            unitId: autoUnitId,
            baseUnit: data.trackInventory ? (data.baseUnit as any) : undefined,
            minimumStock: data.trackInventory ? data.minimumStock : 0,
            unitConversions: productConversions.map((conversion) => ({
              ...conversion,
              baseQuantity: Number(conversion.baseQuantity),
            })),
          },
        }).unwrap();
      }
      setEditingProduct(null);
      resetEdit();
    } catch (err: any) {
      alert(err.data?.message || "Gagal mengubah produk");
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await updateProduct({ id: product.id, body: { isActive: !product.isActive } }).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingProductId) return;
    try {
      await deleteProduct(deletingProductId).unwrap();
      setDeletingProductId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductConversions(((product as any).unitConversions || []) as Array<{ id?: string; unit: string; baseQuantity: number | string; isDefault?: boolean }>);
    resetEdit({
      name: product.name,
      sku: product.sku || "",
      categoryId: product.categoryId,
      price: product.price ? Number(product.price) : undefined as any,
      cost: product.cost ? Number(product.cost) : undefined as any,
      imageUrl: product.imageUrl || "",
      trackInventory: product.trackInventory || false,
      inventoryType: product.inventoryType || "",
      minimumStock: Number(product.minimumStock || 0),
      unitId: product.unitId || "",
      baseUnit: (product as any).baseUnit || "",
    });
  };

  const isLoading = isLoadingProducts || isLoadingCategories || isLoadingUnits;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={TEXT.products.title}
        description={TEXT.products.subtitle}
        actionButton={
          <div className="flex gap-2">
            <Button onClick={() => setIsAddMaterialOpen(true)}>+ Tambah Bahan Baku</Button>
            <Button onClick={() => setIsAddFinishedProductOpen(true)}>+ Tambah Produk Jadi</Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          placeholder="Cari produk berdasarkan nama atau SKU..."
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
        <div className="flex flex-row gap-4">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => {
              setSelectedCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm w-full md:w-48"
          >
            <option value="">Semua Kategori</option>
            {categories.map((cat: Category) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedInventoryTypeFilter}
            onChange={(e) => {
              setSelectedInventoryTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm w-full md:w-48"
          >
            <option value="">Semua Tipe</option>
            <option value="FINISHED_GOOD">Finished Good (Produk Jadi)</option>
            <option value="RAW_MATERIAL">Raw Material (Bahan Baku)</option>
            <option value="PACKAGING">Packaging (Kemasan)</option>
          </select>
        </div>
      </div>

      {!isLoading && filteredProducts.length === 0 ? (
        <EmptyState title={TEXT.products.emptyState} description="Silakan sesuaikan filter atau kata kunci pencarian Anda." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["SKU", TEXT.products.nameCol, "Kategori", "Harga Jual", "Harga Beli", TEXT.common.status, TEXT.common.actions]} isLoading={isLoading}>
            {paginatedProducts.map((p: Product) => (
              <tr
                key={p.id}
                className="group/row border-b border-border/50 hover:bg-surface-secondary/40 cursor-pointer transition"
                onClick={() => {
                  router.push(p.inventoryType === "FINISHED_GOOD" ? `/products/sellable/${p.id}` : `/products/materials/${p.id}`);
                }}
              >
                <td className="px-6 py-4 text-sm font-semibold text-text-secondary">{p.sku || "-"}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-zinc-850" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-border flex items-center justify-center text-xs font-semibold text-text-muted">
                        N/A
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary group-hover/row:underline">{p.name}</span>
                      {(p as any).variants && (p as any).variants.length > 0 && (
                        <span className="text-[10px] text-indigo-400 font-semibold mt-0.5">
                          Varian: {(p as any).variants.map((v: any) => v.name).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{p.category?.name || "Tanpa Kategori"}</td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary">
                  {p.price !== null && p.price !== undefined ? `Rp ${Number(p.price).toLocaleString()}` : "-"}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary">
                  {p.inventoryType === "FINISHED_GOOD"
                    ? (p.cost !== null && p.cost !== undefined ? `Rp ${Number(p.cost).toLocaleString()}` : "-")
                    : ((p as any).variants && (p as any).variants[0]?.cost
                      ? `Rp ${Number((p as any).variants[0].cost).toLocaleString()} / ${(p as any).variants[0].baseUnit}`
                      : "-")
                  }
                </td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={p.isActive} />
                </td>
                <td className="px-6 py-4 text-sm">
                  <ProductActionMenu
                    product={p}
                    onEdit={openEditModal}
                    onRecipe={(productId) => {
                      router.push(`/products/sellable/${productId}`);
                    }}
                    onToggleActive={handleToggleActive}
                    onDelete={(product) => setDeletingProductId(product.id)}
                    onDetail={(product) => {
                      router.push(product.inventoryType === "FINISHED_GOOD" ? `/products/sellable/${product.id}` : `/products/materials/${product.id}`);
                    }}
                  />
                </td>
              </tr>
            ))}
          </DataTable>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-text-secondary">
                Halaman {page} dari {totalPages} ({filteredProducts.length} item)
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  Sebelumnya
                </Button>
                <Button variant="ghost" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateMaterialModal isOpen={isAddMaterialOpen} onClose={() => setIsAddMaterialOpen(false)} />
      <CreateFinishedProductModal isOpen={isAddFinishedProductOpen} onClose={() => setIsAddFinishedProductOpen(false)} />

      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title={TEXT.products.editTitle} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-6">
          {/* Product Information Section */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2 mb-4">
              Product Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="editName"
                label="Product Name"
                error={errorsEdit.name?.message}
                {...registerEdit("name")}
              />
              <Input
                id="editSku"
                label="SKU"
                placeholder="e.g. POP-SLT-XL"
                helperText="Leave empty to generate later or manage manually."
                error={errorsEdit.sku?.message}
                {...registerEdit("sku")}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="editCategoryId" className="text-sm font-medium text-text-primary">
                  Category
                </label>
                <select
                  id="editCategoryId"
                  {...registerEdit("categoryId")}
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                >
                  {categories.map((cat: Category) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errorsEdit.categoryId ? <p className="text-xs text-rose-500 mt-0.5">{errorsEdit.categoryId.message}</p> : null}
              </div>
              {(!trackInventoryEdit || inventoryTypeEdit === "FINISHED_GOOD") ? (
                <Input
                  id="editPrice"
                  label="Selling Price *"
                  type="number"
                  error={errorsEdit.price?.message}
                  {...registerEdit("price", { valueAsNumber: true })}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Selling Price</label>
                  <input
                    type="text"
                    disabled
                    value="-"
                    className="px-3 py-2 bg-zinc-800/50 border border-border rounded-lg text-text-muted text-sm cursor-not-allowed outline-none"
                  />
                  <p className="text-xs text-text-secondary">Produk ini tidak dijual langsung.</p>
                </div>
              )}
              <Input
                id="editCost"
                label="Cost / Harga Beli"
                type="number"
                placeholder="e.g. 20000"
                error={errorsEdit.cost?.message}
                {...registerEdit("cost", { valueAsNumber: true })}
              />
              <div className="md:col-span-2">
                <Input
                  id="editImageUrl"
                  label="Image URL"
                  helperText="Optional. Paste an image URL to display a product preview."
                  error={errorsEdit.imageUrl?.message}
                  {...registerEdit("imageUrl")}
                />
                <LiveImagePreview key={imageUrlEdit} url={imageUrlEdit} />
              </div>
            </div>
          </div>

          {/* Track Stock & Inventory checkbox */}
          <div className="flex flex-col gap-1 py-4 border-t border-border">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trackInventoryEdit"
                {...registerEdit("trackInventory")}
                className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 bg-surface cursor-pointer"
              />
              <label htmlFor="trackInventoryEdit" className="text-sm font-semibold text-text-primary cursor-pointer">
                Track Stock & Inventory
              </label>
            </div>
            <p className="text-xs text-text-secondary ml-7">
              Enable this if this product has physical stock that must be monitored.
            </p>
          </div>

          {/* Inventory Settings Section */}
          {trackInventoryEdit && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2 mb-4">
                Inventory Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editInventoryType" className="text-sm font-medium text-text-primary">
                    Product Type *
                  </label>
                  <select
                    id="editInventoryType"
                    {...registerEdit("inventoryType")}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                  >
                    <option value="">Choose a type...</option>
                    <option value="FINISHED_GOOD">Produk Jadi</option>
                    <option value="RAW_MATERIAL">Bahan Baku</option>
                    <option value="PACKAGING">Material Kemasan</option>
                  </select>
                  {errorsEdit.inventoryType ? <p className="text-xs text-rose-500 mt-0.5">{errorsEdit.inventoryType.message}</p> : null}
                  {/* Dynamic descriptions for selected type */}
                  {inventoryTypeEdit === "FINISHED_GOOD" && (
                    <p className="text-xs text-text-secondary mt-1">
                      <strong>Produk Jadi:</strong> Finished products sold directly to customers. Examples: Popcorn, Coca Cola, Nachos
                    </p>
                  )}
                  {inventoryTypeEdit === "RAW_MATERIAL" && (
                    <p className="text-xs text-text-secondary mt-1">
                      <strong>Bahan Baku:</strong> Ingredients used for recipes. Examples: Corn, Salt, Butter
                    </p>
                  )}
                  {inventoryTypeEdit === "PACKAGING" && (
                    <p className="text-xs text-text-secondary mt-1">
                      <strong>Material Kemasan:</strong> Packaging materials. Examples: Popcorn Bucket, Paper Cup, Plastic Lid
                    </p>
                  )}
                </div>

                {/* unitId field is deprecated and hidden for UX clarity - kept in schema for compatibility */}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editBaseUnit" className="text-sm font-medium text-text-primary">
                    Base Unit *
                  </label>
                  <p className="text-xs text-text-secondary mb-2">
                    The canonical unit used for recipes and inventory calculations.
                  </p>
                  <select
                    id="editBaseUnit"
                    {...registerEdit("baseUnit")}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                  >
                    <option value="">Select a base unit...</option>
                    <option value="G">Gram (G) - for weight</option>
                    <option value="ML">Milliliter (ML) - for volume</option>
                    <option value="PCS">Piece (PCS) - for count</option>
                  </select>
                  {errorsEdit.baseUnit ? <p className="text-xs text-rose-500 mt-0.5">{errorsEdit.baseUnit.message}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <Input
                    id="editMinimumStock"
                    label="Low Stock Alert"
                    type="number"
                    placeholder="e.g. 10"
                    helperText="Set to 0 to disable low stock alerts."
                    error={errorsEdit.minimumStock?.message}
                    {...registerEdit("minimumStock", { valueAsNumber: true })}
                  />
                </div>

                {trackInventoryEdit && editingProduct && (
                  <div className="md:col-span-2 border-t border-border pt-4">
                    <ProductConversions
                      product={editingProduct as Product}
                      onSave={setProductConversions}
                      isLoading={isUpdating}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingProduct(null)}>
              {TEXT.common.cancel}
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              {TEXT.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDelete}
        title={TEXT.products.deleteConfirmTitle}
        message={TEXT.products.deleteConfirmMsg}
        isConfirming={isDeleting}
      />

      {selectedRecipeProductId && (
        <RecipeModal
          isOpen={!!selectedRecipeProductId}
          onClose={() => setSelectedRecipeProductId(null)}
          productId={selectedRecipeProductId}
          allProducts={products}
          allUnits={units}
        />
      )}
    </div>
  );
}
