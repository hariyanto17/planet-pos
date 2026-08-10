"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} from "@/lib/api/tableApi";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/ToastProvider";
import { authCookie } from "@/utils/authCookie";
import { TableActionMenu } from "./components/TableActionMenu";

import { TEXT } from "@/lib/i18n/id";

const tableSchema = zod.object({
  code: zod.string().min(1, "Kode meja wajib diisi"),
  name: zod.string().min(1, "Nama meja wajib diisi"),
});

type TableSchemaInput = zod.infer<typeof tableSchema>;

interface Table {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export default function TablesPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const isAdmin = currentUser?.role === "ADMIN";

  const { data: tables = [], isLoading } = useGetTablesQuery();
  const [createTable, { isLoading: isCreating }] = useCreateTableMutation();
  const [updateTable, { isLoading: isUpdating }] = useUpdateTableMutation();
  const [deleteTable, { isLoading: isDeleting }] = useDeleteTableMutation();

  const toast = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const hasActiveTables = useMemo(() => tables.some((t: Table) => t.isActive), [tables]);

  const handleDownloadAllQrs = async () => {
    setIsBulkDownloading(true);
    toast.success("Mempersiapkan QR Code...");
    try {
      const token = authCookie.getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
      const response = await fetch(`${apiUrl}/tables/qrcodes/download-all`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Tidak ada meja aktif untuk diunduh.");
        }
        throw new Error("Gagal mengunduh kode QR massal.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "concession-table-qrcodes.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("QR Code semua meja berhasil diunduh.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mengunduh kode QR massal.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const pageSize = 8;

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<TableSchemaInput>({
    resolver: zodResolver(tableSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<TableSchemaInput>({
    resolver: zodResolver(tableSchema),
  });

  const filteredTables = useMemo(() => {
    return tables.filter((t: Table) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [tables, search]);

  const paginatedTables = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTables.slice(start, start + pageSize);
  }, [filteredTables, page]);

  const totalPages = Math.max(1, Math.ceil(filteredTables.length / pageSize));

  const handleAdd = async (data: TableSchemaInput) => {
    try {
      await createTable(data).unwrap();
      setIsAddModalOpen(false);
      resetAdd();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (data: TableSchemaInput) => {
    if (!editingTable) return;
    try {
      await updateTable({ id: editingTable.id, body: data }).unwrap();
      setEditingTable(null);
      resetEdit();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (table: Table) => {
    try {
      await updateTable({ id: table.id, body: { isActive: !table.isActive } }).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingTableId) return;
    try {
      await deleteTable(deletingTableId).unwrap();
      setDeletingTableId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (table: Table) => {
    setEditingTable(table);
    resetEdit({ code: table.code, name: table.name });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title={TEXT.tables.title}
        description={TEXT.tables.subtitle}
        actionButton={
          isAdmin ? (
            <div className="flex items-center gap-3">
              {hasActiveTables && (
                <Button
                  variant="secondary"
                  onClick={handleDownloadAllQrs}
                  isLoading={isBulkDownloading}
                >
                  Download Semua QR
                </Button>
              )}
              <Button onClick={() => setIsAddModalOpen(true)}>{TEXT.tables.addBtn}</Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder={TEXT.tables.searchPlaceholder}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </div>

      {!isLoading && filteredTables.length === 0 ? (
        <EmptyState
          title={TEXT.tables.emptyState}
          description={search ? "Silakan cari meja yang lain." : "Mulai dengan menambahkan meja makan di tempat pertama Anda."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["Kode", "Nama", TEXT.common.status, "Tanggal Dibuat", ...(isAdmin ? [TEXT.common.actions] : [])]} isLoading={isLoading}>
            {paginatedTables.map((t: Table) => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-surface/20 transition">
                <td className="px-6 py-4 text-sm font-semibold text-text-primary">{t.code}</td>
                <td className="px-6 py-4 text-sm text-text-primary">{t.name}</td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={t.isActive} />
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {new Date(t.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-sm">
                    <TableActionMenu
                      table={t}
                      onEdit={openEditModal}
                      onToggleActive={handleToggleActive}
                      onDelete={setDeletingTableId}
                    />
                  </td>
                )}
              </tr>
            ))}
          </DataTable>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-text-secondary">
                Halaman {page} dari {totalPages} ({filteredTables.length} item)
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

      {/* Create Table Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={TEXT.tables.addTitle}>
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          <Input label="Kode Meja" placeholder="Misal: T01" error={errorsAdd.code?.message} {...registerAdd("code")} />
          <Input label="Nama Meja" placeholder="Misal: Meja 1" error={errorsAdd.name?.message} {...registerAdd("name")} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              {TEXT.common.cancel}
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Tambah Meja
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Table Modal */}
      <Modal isOpen={!!editingTable} onClose={() => setEditingTable(null)} title={TEXT.tables.editTitle}>
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          <Input label="Kode Meja" error={errorsEdit.code?.message} {...registerEdit("code")} />
          <Input label="Nama Meja" error={errorsEdit.name?.message} {...registerEdit("name")} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingTable(null)}>
              {TEXT.common.cancel}
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              {TEXT.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTableId}
        onClose={() => setDeletingTableId(null)}
        onConfirm={handleDelete}
        title={TEXT.tables.deleteConfirmTitle}
        message="Apakah Anda yakin ingin menghapus meja ini? Tindakan ini tidak dapat dibatalkan."
        isConfirming={isDeleting}
      />
    </div>
  );
}
