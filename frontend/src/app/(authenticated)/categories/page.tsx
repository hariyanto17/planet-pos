"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/lib/api/categoryApi";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

const categorySchema = zod.object({
  name: zod.string().min(1, "Category name is required"),
});

type CategorySchemaInput = zod.infer<typeof categorySchema>;

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const pageSize = 8;

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<CategorySchemaInput>({
    resolver: zodResolver(categorySchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<CategorySchemaInput>({
    resolver: zodResolver(categorySchema),
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((c: Category) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, page]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));

  const handleAdd = async (data: CategorySchemaInput) => {
    try {
      await createCategory(data).unwrap();
      setIsAddModalOpen(false);
      resetAdd();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (data: CategorySchemaInput) => {
    if (!editingCategory) return;
    try {
      await updateCategory({ id: editingCategory.id, body: data }).unwrap();
      setEditingCategory(null);
      resetEdit();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory({ id: category.id, body: { isActive: !category.isActive } }).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategoryId) return;
    try {
      await deleteCategory(deletingCategoryId).unwrap();
      setDeletingCategoryId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    resetEdit({ name: category.name });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Product Categories"
        description="Organize your concession products in custom groups."
        actionButton={
          <Button onClick={() => setIsAddModalOpen(true)}>Add Category</Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search categories..."
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </div>

      {!isLoading && filteredCategories.length === 0 ? (
        <EmptyState title="No categories found" description="Try searching for another category name." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["Name", "Status", "Created At", "Actions"]} isLoading={isLoading}>
            {paginatedCategories.map((c: Category) => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/20 transition">
                <td className="px-6 py-4 text-sm font-medium text-zinc-200">{c.name}</td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={c.isActive} />
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {new Date(c.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </td>
                <td className="px-6 py-4 text-sm flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(c)}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(c)}
                    className="text-amber-400 hover:text-amber-300 font-medium transition"
                  >
                    {c.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => setDeletingCategoryId(c.id)}
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
                Page {page} of {totalPages} ({filteredCategories.length} items)
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Category">
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          <Input label="Category Name" placeholder="e.g. Popcorn" error={errorsAdd.name?.message} {...registerAdd("name")} />
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

      <Modal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} title="Edit Category">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          <Input label="Category Name" error={errorsEdit.name?.message} {...registerEdit("name")} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingCategoryId}
        onClose={() => setDeletingCategoryId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? All products under this category will need update."
        isConfirming={isDeleting}
      />
    </div>
  );
}
