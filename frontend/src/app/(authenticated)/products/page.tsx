"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import Link from "next/link";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
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

const productSchema = zod
  .object({
    name: zod.string().min(1, "Product Name is required"),
    sku: zod.string().optional(),
    categoryId: zod.string().min(1, "Category is required"),
    price: zod.number().positive("Price must be greater than zero"),
    imageUrl: zod.string().url("Must be a valid URL").or(zod.string().length(0)).optional(),
    trackInventory: zod.boolean().optional(),
    inventoryType: zod.string().optional(),
    minimumStock: zod
      .number()
      .min(0, "Low Stock Alert cannot be negative")
      .or(zod.nan())
      .optional(),
    unitId: zod.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.trackInventory) {
      if (!data.inventoryType) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["inventoryType"],
          message: "Product Type is required when tracking stock & inventory",
        });
      }
      if (!data.unitId) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["unitId"],
          message: "Unit is required when tracking stock & inventory",
        });
      }
    }
  });

type ProductSchemaInput = zod.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  price: string;
  imageUrl: string | null;
  isActive: boolean;
  trackInventory?: boolean;
  inventoryType?: string | null;
  minimumStock?: number | null;
  unitId?: string | null;
  category?: {
    name: string;
  };
  unit?: {
    name: string;
    symbol: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

const LiveImagePreview = ({ url }: { url?: string }) => {
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [url]);

  if (!url) return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-400">Live Preview:</span>
      <div className="w-28 h-28 rounded-lg border border-zinc-850 overflow-hidden bg-zinc-900 flex items-center justify-center">
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 text-center p-2">
            <svg className="w-8 h-8 text-zinc-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-zinc-500 font-medium">Invalid Image</span>
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
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const { data: units = [], isLoading: isLoadingUnits } = useGetUnitsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const pageSize = 8;

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
    watch: watchAdd,
  } = useForm<ProductSchemaInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      trackInventory: false,
      minimumStock: 0,
      inventoryType: "",
      unitId: "",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
    watch: watchEdit,
  } = useForm<ProductSchemaInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      trackInventory: false,
      minimumStock: 0,
      inventoryType: "",
      unitId: "",
    },
  });

  const trackInventoryAdd = watchAdd("trackInventory", false);
  const trackInventoryEdit = watchEdit("trackInventory", false);
  const imageUrlAdd = watchAdd("imageUrl");
  const imageUrlEdit = watchEdit("imageUrl");
  const inventoryTypeAdd = watchAdd("inventoryType");
  const inventoryTypeEdit = watchEdit("inventoryType");

  const activeUnits = useMemo(() => {
    return units.filter((u: any) => u.isActive);
  }, [units]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategoryFilter === "" || p.categoryId === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategoryFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const handleAdd = async (data: ProductSchemaInput) => {
    try {
      await createProduct({
        categoryId: data.categoryId,
        sku: data.sku || undefined,
        name: data.name,
        price: data.price,
        imageUrl: data.imageUrl || undefined,
        trackInventory: data.trackInventory || false,
        inventoryType: data.trackInventory ? (data.inventoryType as any) : undefined,
        unitId: data.trackInventory ? data.unitId : undefined,
        minimumStock: data.trackInventory ? data.minimumStock : 0,
      }).unwrap();
      setIsAddModalOpen(false);
      resetAdd();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (data: ProductSchemaInput) => {
    if (!editingProduct) return;
    try {
      await updateProduct({
        id: editingProduct.id,
        body: {
          categoryId: data.categoryId,
          sku: data.sku || undefined,
          name: data.name,
          price: data.price,
          imageUrl: data.imageUrl || undefined,
          trackInventory: data.trackInventory || false,
          inventoryType: data.trackInventory ? (data.inventoryType as any) : undefined,
          unitId: data.trackInventory ? data.unitId : undefined,
          minimumStock: data.trackInventory ? data.minimumStock : 0,
        },
      }).unwrap();
      setEditingProduct(null);
      resetEdit();
    } catch (err) {
      console.error(err);
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
    resetEdit({
      name: product.name,
      sku: product.sku || "",
      categoryId: product.categoryId,
      price: Number(product.price),
      imageUrl: product.imageUrl || "",
      trackInventory: product.trackInventory || false,
      inventoryType: product.inventoryType || "",
      minimumStock: Number(product.minimumStock || 0),
      unitId: product.unitId || "",
    });
  };

  const isLoading = isLoadingProducts || isLoadingCategories || isLoadingUnits;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={TEXT.products.title}
        description={TEXT.products.subtitle}
        actionButton={
          <Button onClick={() => setIsAddModalOpen(true)}>{TEXT.products.addBtn}</Button>
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

        <select
          value={selectedCategoryFilter}
          onChange={(e) => {
            setSelectedCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm w-full md:w-48"
        >
          <option value="">Semua Kategori</option>
          {categories.map((cat: Category) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {!isLoading && filteredProducts.length === 0 ? (
        <EmptyState title={TEXT.products.emptyState} description="Silakan sesuaikan filter atau kata kunci pencarian Anda." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["SKU", TEXT.products.nameCol, "Kategori", "Harga", TEXT.common.status, TEXT.common.actions]} isLoading={isLoading}>
            {paginatedProducts.map((p: Product) => (
              <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/20 transition">
                <td className="px-6 py-4 text-sm font-semibold text-zinc-400">{p.sku || "-"}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-zinc-850" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-500">
                        N/A
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200">{p.name}</span>
                      {p.trackInventory && p.unit && (
                        <span className="text-[10px] text-indigo-400 font-semibold mt-0.5">
                          Satuan: {p.unit.name} ({p.unit.symbol})
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">{p.category?.name || "Tanpa Kategori"}</td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-200">
                  Rp {Number(p.price).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={p.isActive} />
                </td>
                <td className="px-6 py-4 text-sm flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(p)}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    {TEXT.common.edit}
                  </button>
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="text-amber-400 hover:text-amber-300 font-medium transition"
                  >
                    {p.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => setDeletingProductId(p.id)}
                    className="text-rose-400 hover:text-rose-300 font-medium transition"
                  >
                    {TEXT.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <span className="text-sm text-zinc-400">
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={TEXT.products.addTitle} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-6">
          {/* Product Information Section */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 mb-4">
              Product Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="addName"
                label="Product Name"
                placeholder="e.g. Salted Popcorn XL"
                error={errorsAdd.name?.message}
                {...registerAdd("name")}
              />
              <Input
                id="addSku"
                label="SKU"
                placeholder="e.g. POP-SLT-XL"
                helperText="Leave empty to generate later or manage manually."
                error={errorsAdd.sku?.message}
                {...registerAdd("sku")}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="addCategoryId" className="text-sm font-medium text-zinc-300">
                  Category
                </label>
                <select
                  id="addCategoryId"
                  {...registerAdd("categoryId")}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat: Category) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errorsAdd.categoryId ? <p className="text-xs text-rose-500 mt-0.5">{errorsAdd.categoryId.message}</p> : null}
              </div>
              <Input
                id="addPrice"
                label="Selling Price"
                type="number"
                placeholder="e.g. 35000"
                error={errorsAdd.price?.message}
                {...registerAdd("price", { valueAsNumber: true })}
              />
              <div className="md:col-span-2">
                <Input
                  id="addImageUrl"
                  label="Image URL"
                  placeholder="e.g. https://example.com/popcorn.jpg"
                  helperText="Optional. Paste an image URL to display a product preview."
                  error={errorsAdd.imageUrl?.message}
                  {...registerAdd("imageUrl")}
                />
                <LiveImagePreview url={imageUrlAdd} />
              </div>
            </div>
          </div>

          {/* Track Stock & Inventory checkbox */}
          <div className="flex flex-col gap-1 py-4 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trackInventoryAdd"
                {...registerAdd("trackInventory")}
                className="w-4 h-4 rounded border-zinc-800 text-indigo-600 focus:ring-indigo-500 bg-zinc-900 cursor-pointer"
              />
              <label htmlFor="trackInventoryAdd" className="text-sm font-semibold text-zinc-200 cursor-pointer">
                Track Stock & Inventory
              </label>
            </div>
            <p className="text-xs text-zinc-400 ml-7">
              Enable this if this product has physical stock that must be monitored.
            </p>
          </div>

          {/* Inventory Settings Section */}
          {trackInventoryAdd && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 mb-4">
                Inventory Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="addInventoryType" className="text-sm font-medium text-zinc-300">
                    Product Type *
                  </label>
                  <select
                    id="addInventoryType"
                    {...registerAdd("inventoryType")}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                  >
                    <option value="">Choose a type...</option>
                    <option value="FINISHED_GOOD">Produk Jadi</option>
                    <option value="RAW_MATERIAL">Bahan Baku</option>
                    <option value="PACKAGING">Material Kemasan</option>
                  </select>
                  {errorsAdd.inventoryType ? <p className="text-xs text-rose-500 mt-0.5">{errorsAdd.inventoryType.message}</p> : null}
                  {/* Dynamic descriptions for selected type */}
                  {inventoryTypeAdd === "FINISHED_GOOD" && (
                    <p className="text-xs text-zinc-400 mt-1">
                      <strong>Produk Jadi:</strong> Finished products sold directly to customers. Examples: Popcorn, Coca Cola, Nachos
                    </p>
                  )}
                  {inventoryTypeAdd === "RAW_MATERIAL" && (
                    <p className="text-xs text-zinc-400 mt-1">
                      <strong>Bahan Baku:</strong> Ingredients used for recipes. Examples: Corn, Salt, Butter
                    </p>
                  )}
                  {inventoryTypeAdd === "PACKAGING" && (
                    <p className="text-xs text-zinc-400 mt-1">
                      <strong>Material Kemasan:</strong> Packaging materials. Examples: Popcorn Bucket, Paper Cup, Plastic Lid
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="addUnitId" className="text-sm font-medium text-zinc-300">
                    Unit *
                  </label>
                  {activeUnits.length === 0 ? (
                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                      <span>No active units found.</span>
                      <Link href="/warehouse/settings/units" className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 rounded transition duration-200">
                        Manage Units
                      </Link>
                    </div>
                  ) : (
                    <select
                      id="addUnitId"
                      {...registerAdd("unitId")}
                      className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                    >
                      <option value="">Select a unit...</option>
                      {activeUnits.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.symbol})
                        </option>
                      ))}
                    </select>
                  )}
                  {errorsAdd.unitId ? <p className="text-xs text-rose-500 mt-0.5">{errorsAdd.unitId.message}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <Input
                    id="addMinimumStock"
                    label="Low Stock Alert"
                    type="number"
                    placeholder="e.g. 10"
                    helperText="Set to 0 to disable low stock alerts."
                    error={errorsAdd.minimumStock?.message}
                    {...registerAdd("minimumStock", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              {TEXT.common.cancel}
            </Button>
            <Button type="submit" isLoading={isCreating}>
              {TEXT.common.add}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title={TEXT.products.editTitle} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-6">
          {/* Product Information Section */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 mb-4">
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
                <label htmlFor="editCategoryId" className="text-sm font-medium text-zinc-300">
                  Category
                </label>
                <select
                  id="editCategoryId"
                  {...registerEdit("categoryId")}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                >
                  {categories.map((cat: Category) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errorsEdit.categoryId ? <p className="text-xs text-rose-500 mt-0.5">{errorsEdit.categoryId.message}</p> : null}
              </div>
              <Input
                id="editPrice"
                label="Selling Price"
                type="number"
                error={errorsEdit.price?.message}
                {...registerEdit("price", { valueAsNumber: true })}
              />
              <div className="md:col-span-2">
                <Input
                  id="editImageUrl"
                  label="Image URL"
                  helperText="Optional. Paste an image URL to display a product preview."
                  error={errorsEdit.imageUrl?.message}
                  {...registerEdit("imageUrl")}
                />
                <LiveImagePreview url={imageUrlEdit} />
              </div>
            </div>
          </div>

          {/* Track Stock & Inventory checkbox */}
          <div className="flex flex-col gap-1 py-4 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trackInventoryEdit"
                {...registerEdit("trackInventory")}
                className="w-4 h-4 rounded border-zinc-800 text-indigo-600 focus:ring-indigo-500 bg-zinc-900 cursor-pointer"
              />
              <label htmlFor="trackInventoryEdit" className="text-sm font-semibold text-zinc-200 cursor-pointer">
                Track Stock & Inventory
              </label>
            </div>
            <p className="text-xs text-zinc-400 ml-7">
              Enable this if this product has physical stock that must be monitored.
            </p>
          </div>

          {/* Inventory Settings Section */}
          {trackInventoryEdit && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 mb-4">
                Inventory Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editInventoryType" className="text-sm font-medium text-zinc-300">
                    Product Type *
                  </label>
                  <select
                    id="editInventoryType"
                    {...registerEdit("inventoryType")}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                  >
                    <option value="">Choose a type...</option>
                    <option value="FINISHED_GOOD">Produk Jadi</option>
                    <option value="RAW_MATERIAL">Bahan Baku</option>
                    <option value="PACKAGING">Material Kemasan</option>
                  </select>
                  {errorsEdit.inventoryType ? <p className="text-xs text-rose-500 mt-0.5">{errorsEdit.inventoryType.message}</p> : null}
                  {/* Dynamic descriptions for selected type */}
                  {inventoryTypeEdit === "FINISHED_GOOD" && (
                    <p className="text-xs text-zinc-400 mt-1">
                      <strong>Produk Jadi:</strong> Finished products sold directly to customers. Examples: Popcorn, Coca Cola, Nachos
                    </p>
                  )}
                  {inventoryTypeEdit === "RAW_MATERIAL" && (
                    <p className="text-xs text-zinc-400 mt-1">
                      <strong>Bahan Baku:</strong> Ingredients used for recipes. Examples: Corn, Salt, Butter
                    </p>
                  )}
                  {inventoryTypeEdit === "PACKAGING" && (
                    <p className="text-xs text-zinc-400 mt-1">
                      <strong>Material Kemasan:</strong> Packaging materials. Examples: Popcorn Bucket, Paper Cup, Plastic Lid
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editUnitId" className="text-sm font-medium text-zinc-300">
                    Unit *
                  </label>
                  {activeUnits.length === 0 ? (
                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                      <span>No active units found.</span>
                      <Link href="/warehouse/settings/units" className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 rounded transition duration-200">
                        Manage Units
                      </Link>
                    </div>
                  ) : (
                    <select
                      id="editUnitId"
                      {...registerEdit("unitId")}
                      className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
                    >
                      <option value="">Select a unit...</option>
                      {activeUnits.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.symbol})
                        </option>
                      ))}
                    </select>
                  )}
                  {errorsEdit.unitId ? <p className="text-xs text-rose-500 mt-0.5">{errorsEdit.unitId.message}</p> : null}
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
    </div>
  );
}
