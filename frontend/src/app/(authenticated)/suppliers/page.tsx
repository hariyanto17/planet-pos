"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from "@/lib/api/productApi";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { IconButton } from "@/components/IconButton";
import { Pencil, CircleSlash, CheckCircle, Trash2 } from "lucide-react";
import { TEXT } from "@/lib/i18n/id";

const supplierSchema = zod.object({
  name: zod.string().min(1, "Nama supplier wajib diisi"),
  code: zod.string().optional(),
});

type SupplierSchemaInput = zod.infer<typeof supplierSchema>;

interface Supplier {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useGetSuppliersQuery();
  const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const pageSize = 8;

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<SupplierSchemaInput>({
    resolver: zodResolver(supplierSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<SupplierSchemaInput>({
    resolver: zodResolver(supplierSchema),
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s: Supplier) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
    );
  }, [suppliers, search]);

  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));

  const handleAdd = async (data: SupplierSchemaInput) => {
    try {
      await createSupplier(data).unwrap();
      setIsAddModalOpen(false);
      resetAdd();
    } catch (err: any) {
      alert(err.data?.message || "Gagal membuat supplier");
    }
  };

  const handleEdit = async (data: SupplierSchemaInput) => {
    if (!editingSupplier) return;
    try {
      await updateSupplier({ id: editingSupplier.id, ...data, isActive: editingSupplier.isActive }).unwrap();
      setEditingSupplier(null);
      resetEdit();
    } catch (err: any) {
      alert(err.data?.message || "Gagal memperbarui supplier");
    }
  };

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      await updateSupplier({
        id: supplier.id,
        name: supplier.name,
        code: supplier.code || undefined,
        isActive: !supplier.isActive,
      }).unwrap();
    } catch (err: any) {
      alert(err.data?.message || "Gagal memperbarui status supplier");
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplierId) return;
    try {
      await deleteSupplier(deletingSupplierId).unwrap();
      setDeletingSupplierId(null);
    } catch (err: any) {
      alert(err.data?.message || "Gagal menghapus supplier");
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    resetEdit({
      name: supplier.name,
      code: supplier.code || "",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Daftar Supplier"
        description="Kelola daftar mitra supplier penyuplai bahan baku stok."
        actionButton={
          <Button onClick={() => setIsAddModalOpen(true)}>Tambah Supplier</Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Cari kode atau nama supplier..."
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </div>

      {!isLoading && filteredSuppliers.length === 0 ? (
        <EmptyState title="Supplier tidak ditemukan" description="Silakan cari nama atau kode supplier lain." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["Kode Supplier", "Nama Supplier", TEXT.common.status, "Tanggal Dibuat", TEXT.common.actions]} isLoading={isLoading}>
            {paginatedSuppliers.map((s: Supplier) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-surface/20 transition">
                <td className="px-6 py-4 text-sm font-semibold text-text-secondary">{s.code || "-"}</td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary">{s.name}</td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={s.isActive} />
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {new Date(s.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </td>
                <td className="px-6 py-4 text-sm flex items-center gap-2">
                  <IconButton
                    icon={Pencil}
                    label={TEXT.common.edit}
                    onClick={() => openEditModal(s)}
                    variant="ghost"
                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10"
                  />
                  <IconButton
                    icon={s.isActive ? CircleSlash : CheckCircle}
                    label={s.isActive ? "Nonaktifkan" : "Aktifkan"}
                    onClick={() => handleToggleActive(s)}
                    variant="ghost"
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                  />
                  <IconButton
                    icon={Trash2}
                    label={TEXT.common.delete}
                    onClick={() => setDeletingSupplierId(s.id)}
                    variant="danger"
                  />
                </td>
              </tr>
            ))}
          </DataTable>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-text-secondary">
                Halaman {page} dari {totalPages} ({filteredSuppliers.length} item)
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

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Supplier Baru">
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          <Input label="Kode Supplier (Opsional)" placeholder="Misal: PT-JAYA" error={errorsAdd.code?.message} {...registerAdd("code")} />
          <Input label="Nama Supplier" placeholder="Misal: PT Jaya Abadi" error={errorsAdd.name?.message} {...registerAdd("name")} required />
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

      {/* Edit Modal */}
      <Modal isOpen={!!editingSupplier} onClose={() => setEditingSupplier(null)} title="Ubah Supplier">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          <Input label="Kode Supplier (Opsional)" placeholder="Misal: PT-JAYA" error={errorsEdit.code?.message} {...registerEdit("code")} />
          <Input label="Nama Supplier" placeholder="Misal: PT Jaya Abadi" error={errorsEdit.name?.message} {...registerEdit("name")} required />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingSupplier(null)}>
              {TEXT.common.cancel}
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              {TEXT.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deletingSupplierId}
        onClose={() => setDeletingSupplierId(null)}
        onConfirm={handleDelete}
        title="Hapus Supplier"
        message="Apakah Anda yakin ingin menghapus supplier ini? Jika supplier ini terikat ke histori stok, statusnya akan dinonaktifkan."
        isConfirming={isDeleting}
      />
    </div>
  );
}
