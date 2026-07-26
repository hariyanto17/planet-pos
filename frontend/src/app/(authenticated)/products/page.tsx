"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "@/lib/api/productApi";
import { useGetCategoriesQuery } from "@/lib/api/categoryApi";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

const productSchema = zod.object({
  name: zod.string().min(1, "Product name is required"),
  sku: zod.string().min(1, "SKU is required"),
  categoryId: zod.string().min(1, "Category is required"),
  price: zod.number().positive("Price must be greater than zero"),
  imageUrl: zod.string().url("Must be a valid URL").or(zod.string().length(0)).optional(),
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
  category?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery();
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
  } = useForm<ProductSchemaInput>({
    resolver: zodResolver(productSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<ProductSchemaInput>({
    resolver: zodResolver(productSchema),
  });

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
        ...data,
        imageUrl: data.imageUrl || undefined,
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
          ...data,
          imageUrl: data.imageUrl || undefined,
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
    });
  };

  const isLoading = isLoadingProducts || isLoadingCategories;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products Directory"
        description="Add, remove, and configure concessions product items and pricing."
        actionButton={
          <Button onClick={() => setIsAddModalOpen(true)}>Add Product</Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          placeholder="Search products by name or SKU..."
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
          <option value="">All Categories</option>
          {categories.map((cat: Category) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {!isLoading && filteredProducts.length === 0 ? (
        <EmptyState title="No products found" description="Try resetting your filters or search keywords." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["SKU", "Name", "Category", "Price", "Status", "Actions"]} isLoading={isLoading}>
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
                    <span className="text-sm font-medium text-zinc-200">{p.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">{p.category?.name || "Uncategorized"}</td>
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
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="text-amber-400 hover:text-amber-300 font-medium transition"
                  >
                    {p.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => setDeletingProductId(p.id)}
                    className="text-rose-400 hover:text-rose-300 font-medium transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <span className="text-sm text-zinc-400">
                Page {page} of {totalPages} ({filteredProducts.length} items)
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="ghost" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Product">
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          <Input label="Product Name" placeholder="e.g. Salted Popcorn XL" error={errorsAdd.name?.message} {...registerAdd("name")} />
          <Input label="SKU Code" placeholder="e.g. POP-SLT-XL" error={errorsAdd.sku?.message} {...registerAdd("sku")} />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Category</label>
            <select
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

          <Input label="Price (Rp)" type="number" placeholder="e.g. 35000" error={errorsAdd.price?.message} {...registerAdd("price", { valueAsNumber: true })} />
          <Input label="Image URL" placeholder="e.g. https://example.com/popcorn.jpg" error={errorsAdd.imageUrl?.message} {...registerAdd("imageUrl")} />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Edit Product">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          <Input label="Product Name" error={errorsEdit.name?.message} {...registerEdit("name")} />
          <Input label="SKU Code" error={errorsEdit.sku?.message} {...registerEdit("sku")} />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Category</label>
            <select
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

          <Input label="Price (Rp)" type="number" error={errorsEdit.price?.message} {...registerEdit("price", { valueAsNumber: true })} />
          <Input label="Image URL" error={errorsEdit.imageUrl?.message} {...registerEdit("imageUrl")} />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? It will be removed from cashier consoles immediately."
        isConfirming={isDeleting}
      />
    </div>
  );
}
