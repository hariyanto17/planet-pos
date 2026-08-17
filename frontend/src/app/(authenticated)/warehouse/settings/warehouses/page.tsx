"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetWarehousesListQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeactivateWarehouseMutation,
} from "@/lib/api/warehousesApi";
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
import { Pencil, CircleSlash, CheckCircle, Ban } from "lucide-react";
import { TEXT } from "@/lib/i18n/id";
import { useToast } from "@/components/ToastProvider";

const warehouseSchema = zod.object({
  code: zod.string().min(1, "Kode gudang wajib diisi"),
  name: zod.string().min(1, "Nama gudang wajib diisi"),
  warehouseType: zod.enum(["SALES", "KITCHEN_STORAGE", "GENERAL"]),
  isDefaultKitchenStorage: zod.boolean(),
});

type WarehouseSchemaInput = zod.infer<typeof warehouseSchema>;

interface Warehouse {
  id: string;
  code: string;
  name: string;
  warehouseType: "SALES" | "KITCHEN_STORAGE" | "GENERAL";
  isDefaultKitchenStorage: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function WarehousesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 8;
  const toast = useToast();

  const { data: warehousesData, isLoading } = useGetWarehousesListQuery({
    search: search || undefined,
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [createWarehouse, { isLoading: isCreating }] = useCreateWarehouseMutation();
  const [updateWarehouse, { isLoading: isUpdating }] = useUpdateWarehouseMutation();
  const [deactivateWarehouse, { isLoading: isDeactivating }] = useDeactivateWarehouseMutation();

  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deactivatingWarehouseId, setDeactivatingWarehouseId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const warehousesList = warehousesData?.data || [];
  const pagination = warehousesData?.pagination || { total: 0, page: 1, limit: 8, totalPages: 1 };

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<WarehouseSchemaInput>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      code: "",
      name: "",
      warehouseType: "SALES",
      isDefaultKitchenStorage: false,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<WarehouseSchemaInput>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      code: "",
      name: "",
      warehouseType: "SALES",
      isDefaultKitchenStorage: false,
    },
  });

  const handleAdd = async (data: WarehouseSchemaInput) => {
    setErrorMsg("");
    try {
      await createWarehouse(data).unwrap();
      setIsAddModalOpen(false);
      resetAdd({ code: "", name: "", warehouseType: "SALES", isDefaultKitchenStorage: false });
      toast.success("Gudang berhasil ditambahkan");
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal menambahkan gudang");
    }
  };

  const handleEdit = async (data: WarehouseSchemaInput) => {
    if (!editingWarehouse) return;
    setErrorMsg("");
    try {
      await updateWarehouse({ id: editingWarehouse.id, body: data }).unwrap();
      setEditingWarehouse(null);
      resetEdit();
      toast.success("Gudang berhasil diperbarui");
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Gagal memperbarui gudang");
    }
  };

  const handleToggleActive = async (warehouse: Warehouse) => {
    setErrorMsg("");
    try {
      await updateWarehouse({ id: warehouse.id, body: { isActive: !warehouse.isActive } }).unwrap();
      toast.success(`Gudang berhasil ${!warehouse.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal mengubah status aktif");
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingWarehouseId) return;
    setErrorMsg("");
    try {
      await deactivateWarehouse(deactivatingWarehouseId).unwrap();
      setDeactivatingWarehouseId(null);
      toast.success("Gudang berhasil dinonaktifkan tetap");
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal menonaktifkan gudang");
      setDeactivatingWarehouseId(null);
    }
  };

  const openEditModal = (warehouse: Warehouse) => {
    setErrorMsg("");
    setEditingWarehouse(warehouse);
    resetEdit({
      code: warehouse.code,
      name: warehouse.name,
      warehouseType: warehouse.warehouseType,
      isDefaultKitchenStorage: warehouse.isDefaultKitchenStorage,
    });
  };

  const openAddModal = () => {
    setErrorMsg("");
    setIsAddModalOpen(true);
    resetAdd({ code: "", name: "", warehouseType: "SALES", isDefaultKitchenStorage: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan Gudang"
        description="Kelola master lokasi penyimpanan gudang untuk penempatan stok barang konsesi."
        actionButton={
          <Button onClick={openAddModal}>Tambah Gudang</Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Cari berdasarkan kode atau nama..."
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </div>

      {!isLoading && warehousesList.length === 0 ? (
        <EmptyState title="Belum Ada Gudang" description="Silakan tambahkan gudang baru atau sesuaikan kata kunci pencarian Anda." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["Kode", "Nama Gudang", "Tipe", TEXT.common.status, "Tanggal Dibuat", TEXT.common.actions]} isLoading={isLoading}>
            {warehousesList.map((w: Warehouse) => (
              <tr key={w.id} className="border-b border-border/50 hover:bg-surface/20 transition">
                <td className="px-6 py-4 text-sm font-extrabold text-indigo-400">{w.code}</td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary">{w.name}</td>
                <td className="px-6 py-4 text-sm text-text-primary">
                  {w.warehouseType === "KITCHEN_STORAGE" ? "Dapur" : w.warehouseType === "GENERAL" ? "Umum" : "Penjualan"}
                  {w.isDefaultKitchenStorage ? " • Default Dapur" : ""}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={w.isActive} />
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {new Date(w.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </td>
                <td className="px-6 py-4 text-sm flex items-center gap-2">
                  <IconButton
                    icon={Pencil}
                    label={TEXT.common.edit}
                    onClick={() => openEditModal(w)}
                    variant="ghost"
                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10"
                  />
                  <IconButton
                    icon={w.isActive ? CircleSlash : CheckCircle}
                    label={w.isActive ? "Nonaktifkan" : "Aktifkan"}
                    onClick={() => handleToggleActive(w)}
                    variant="ghost"
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                  />
                  {w.isActive && (
                    <IconButton
                      icon={Ban}
                      label="Nonaktifkan Tetap"
                      onClick={() => setDeactivatingWarehouseId(w.id)}
                      variant="danger"
                    />
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
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Gudang Baru">
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}
          <Input label="Kode Gudang" placeholder="Misal: CONCESSION, WAREHOUSE-A" error={errorsAdd.code?.message} {...registerAdd("code")} />
          <Input label="Nama Gudang" placeholder="Misal: Gudang Konsesi Utama" error={errorsAdd.name?.message} {...registerAdd("name")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-text-primary">
              Tipe Gudang
              <select
                {...registerAdd("warehouseType")}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none text-sm"
              >
                <option value="SALES">Gudang Penjualan</option>
                <option value="KITCHEN_STORAGE">Gudang Dapur</option>
                <option value="GENERAL">Gudang Umum</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm text-text-primary">
              <input type="checkbox" {...registerAdd("isDefaultKitchenStorage")} className="rounded border-border bg-surface text-indigo-500 focus:ring-indigo-500" />
              Tetapkan sebagai Default Gudang Dapur
            </label>
          </div>
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
      <Modal isOpen={!!editingWarehouse} onClose={() => setEditingWarehouse(null)} title="Ubah Gudang">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}
          <Input label="Kode Gudang" error={errorsEdit.code?.message} {...registerEdit("code")} />
          <Input label="Nama Gudang" error={errorsEdit.name?.message} {...registerEdit("name")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-text-primary">
              Tipe Gudang
              <select
                {...registerEdit("warehouseType")}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary outline-none text-sm"
              >
                <option value="SALES">Gudang Penjualan</option>
                <option value="KITCHEN_STORAGE">Gudang Dapur</option>
                <option value="GENERAL">Gudang Umum</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm text-text-primary">
              <input type="checkbox" {...registerEdit("isDefaultKitchenStorage")} className="rounded border-border bg-surface text-indigo-500 focus:ring-indigo-500" />
              Tetapkan sebagai Default Gudang Dapur
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingWarehouse(null)}>
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
        isOpen={!!deactivatingWarehouseId}
        onClose={() => setDeactivatingWarehouseId(null)}
        onConfirm={handleDeactivate}
        title="Nonaktifkan Gudang?"
        message="Apakah Anda yakin ingin menonaktifkan gudang ini? Gudang tidak akan bisa dipilih untuk penempatan stok baru."
        isConfirming={isDeactivating}
      />
    </div>
  );
}
