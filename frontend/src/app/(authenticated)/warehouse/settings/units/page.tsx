"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetUnitsListQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeactivateUnitMutation,
} from "@/lib/api/unitsApi";
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
import { useToast } from "@/components/ToastProvider";

const unitSchema = zod.object({
  name: zod.string().min(1, "Nama satuan wajib diisi"),
  symbol: zod.string().min(1, "Simbol satuan wajib diisi"),
});

type UnitSchemaInput = zod.infer<typeof unitSchema>;

interface Unit {
  id: string;
  name: string;
  symbol: string;
  isActive: boolean;
  createdAt: string;
}

export default function UnitsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 8;
  const toast = useToast();

  const { data: unitsData, isLoading } = useGetUnitsListQuery({
    search: search || undefined,
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [createUnit, { isLoading: isCreating }] = useCreateUnitMutation();
  const [updateUnit, { isLoading: isUpdating }] = useUpdateUnitMutation();
  const [deactivateUnit, { isLoading: isDeactivating }] = useDeactivateUnitMutation();

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deactivatingUnitId, setDeactivatingUnitId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const unitsList = unitsData?.data || [];
  const pagination = unitsData?.pagination || { total: 0, page: 1, limit: 8, totalPages: 1 };

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<UnitSchemaInput>({
    resolver: zodResolver(unitSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<UnitSchemaInput>({
    resolver: zodResolver(unitSchema),
  });

  const handleAdd = async (data: UnitSchemaInput) => {
    setErrorMsg("");
    try {
      await createUnit(data).unwrap();
      setIsAddModalOpen(false);
      resetAdd();
      toast.success("Satuan berhasil ditambahkan");
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal menambahkan satuan");
    }
  };

  const handleEdit = async (data: UnitSchemaInput) => {
    if (!editingUnit) return;
    setErrorMsg("");
    try {
      await updateUnit({ id: editingUnit.id, body: data }).unwrap();
      setEditingUnit(null);
      resetEdit();
      toast.success("Satuan berhasil diperbarui");
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal memperbarui satuan");
    }
  };

  const handleToggleActive = async (unit: Unit) => {
    setErrorMsg("");
    try {
      await updateUnit({ id: unit.id, body: { isActive: !unit.isActive } }).unwrap();
      toast.success(`Satuan berhasil ${!unit.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal mengubah status aktif");
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingUnitId) return;
    setErrorMsg("");
    try {
      await deactivateUnit(deactivatingUnitId).unwrap();
      setDeactivatingUnitId(null);
      toast.success("Satuan berhasil dinonaktifkan tetap");
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal menonaktifkan satuan");
      setDeactivatingUnitId(null);
    }
  };

  const openEditModal = (unit: Unit) => {
    setErrorMsg("");
    setEditingUnit(unit);
    resetEdit({
      name: unit.name,
      symbol: unit.symbol,
    });
  };

  const openAddModal = () => {
    setErrorMsg("");
    setIsAddModalOpen(true);
    resetAdd({ name: "", symbol: "" });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan Satuan"
        description="Kelola master data satuan barang (Unit) yang digunakan dalam stok produk."
        actionButton={
          <Button onClick={openAddModal}>Tambah Satuan</Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Cari berdasarkan nama atau simbol..."
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </div>

      {!isLoading && unitsList.length === 0 ? (
        <EmptyState title="Belum Ada Satuan" description="Silakan tambahkan satuan baru atau sesuaikan kata kunci pencarian Anda." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["Simbol", "Nama Satuan", TEXT.common.status, "Tanggal Dibuat", TEXT.common.actions]} isLoading={isLoading}>
            {unitsList.map((u: Unit) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-surface/20 transition">
                <td className="px-6 py-4 text-sm font-extrabold text-indigo-400">{u.symbol}</td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary">{u.name}</td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={u.isActive} />
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {new Date(u.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </td>
                <td className="px-6 py-4 text-sm flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(u)}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    {TEXT.common.edit}
                  </button>
                  <button
                    onClick={() => handleToggleActive(u)}
                    className="text-amber-400 hover:text-amber-300 font-medium transition"
                  >
                    {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  {u.isActive && (
                    <button
                      onClick={() => setDeactivatingUnitId(u.id)}
                      className="text-rose-400 hover:text-rose-300 font-medium transition"
                    >
                      Nonaktifkan Tetap
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-text-secondary">
                Halaman {page} dari {pagination.totalPages} ({pagination.total} item)
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  Sebelumnya
                </Button>
                <Button variant="ghost" onClick={() => setPage(page + 1)} disabled={page === pagination.totalPages}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Satuan Baru">
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}
          <Input label="Simbol Satuan" placeholder="Misal: PCS, KG, LTR" error={errorsAdd.symbol?.message} {...registerAdd("symbol")} />
          <Input label="Nama Satuan" placeholder="Misal: Pieces, Kilogram, Liter" error={errorsAdd.name?.message} {...registerAdd("name")} />
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
      <Modal isOpen={!!editingUnit} onClose={() => setEditingUnit(null)} title="Ubah Satuan">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}
          <Input label="Simbol Satuan" error={errorsEdit.symbol?.message} {...registerEdit("symbol")} />
          <Input label="Nama Satuan" error={errorsEdit.name?.message} {...registerEdit("name")} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingUnit(null)}>
              {TEXT.common.cancel}
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              {TEXT.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deactivatingUnitId}
        onClose={() => setDeactivatingUnitId(null)}
        onConfirm={handleDeactivate}
        title="Nonaktifkan Satuan?"
        message="Apakah Anda yakin ingin menonaktifkan satuan ini? Satuan tidak akan bisa dipilih untuk produk baru."
        isConfirming={isDeactivating}
      />
    </div>
  );
}
