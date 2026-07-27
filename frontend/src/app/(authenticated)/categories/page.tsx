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
import { TEXT } from "@/lib/i18n/id";

const categorySchema = zod.object({
  name: zod.string().min(1, "Nama kategori wajib diisi"),
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
        title={TEXT.categories.title}
        description={TEXT.categories.subtitle}
        actionButton={
          <Button onClick={() => setIsAddModalOpen(true)}>{TEXT.categories.addBtn}</Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder={TEXT.categories.searchPlaceholder}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </div>

      {!isLoading && filteredCategories.length === 0 ? (
        <EmptyState title={TEXT.categories.emptyState} description="Silakan cari nama kategori lain." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={[TEXT.categories.nameCol, TEXT.common.status, "Tanggal Dibuat", TEXT.common.actions]} isLoading={isLoading}>
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
                    {TEXT.common.edit}
                  </button>
                  <button
                    onClick={() => handleToggleActive(c)}
                    className="text-amber-400 hover:text-amber-300 font-medium transition"
                  >
                    {c.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => setDeletingCategoryId(c.id)}
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
                Halaman {page} dari {totalPages} ({filteredCategories.length} item)
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={TEXT.categories.addTitle}>
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          <Input label={TEXT.categories.nameCol} placeholder="Misal: Popcorn" error={errorsAdd.name?.message} {...registerAdd("name")} />
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

      <Modal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} title={TEXT.categories.editTitle}>
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          <Input label={TEXT.categories.nameCol} error={errorsEdit.name?.message} {...registerEdit("name")} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingCategory(null)}>
              {TEXT.common.cancel}
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              {TEXT.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingCategoryId}
        onClose={() => setDeletingCategoryId(null)}
        onConfirm={handleDelete}
        title={TEXT.categories.deleteConfirmTitle}
        message="Apakah Anda yakin ingin menghapus kategori ini? Semua produk di bawah kategori ini perlu diperbarui."
        isConfirming={isDeleting}
      />
    </div>
  );
}
