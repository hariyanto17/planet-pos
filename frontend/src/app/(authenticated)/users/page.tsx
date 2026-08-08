"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/lib/api/userApi";
import { useGetWarehousesQuery } from "@/lib/api/inventoryApi";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { TEXT } from "@/lib/i18n/id";
import { useToast } from "@/components/ToastProvider";

const createUserSchema = zod
  .object({
    fullName: zod.string().min(1, "Nama lengkap wajib diisi"),
    username: zod.string().min(3, "Nama pengguna minimal 3 karakter").max(30, "Nama pengguna maksimal 30 karakter"),
    password: zod.string().min(6, "Kata sandi minimal 6 karakter"),
    confirmPassword: zod.string().min(1, "Konfirmasi kata sandi wajib diisi"),
    role: zod.string().min(1, "Peran akses wajib dipilih"),
    isActive: zod.boolean().optional(),
    warehouseId: zod.string().optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  })
  .refine((data) => {
    if (data.role === "WAREHOUSE" && !data.warehouseId) return false;
    return true;
  }, {
    message: "Penugasan gudang wajib diisi untuk peran WAREHOUSE",
    path: ["warehouseId"],
  });

const updateUserSchema = zod
  .object({
    fullName: zod.string().min(1, "Nama lengkap wajib diisi"),
    username: zod.string().min(3, "Nama pengguna minimal 3 karakter").max(30, "Nama pengguna maksimal 30 karakter"),
    role: zod.string().min(1, "Peran akses wajib dipilih"),
    isActive: zod.boolean(),
    warehouseId: zod.string().optional().nullable(),
  })
  .refine((data) => {
    if (data.role === "WAREHOUSE" && !data.warehouseId) return false;
    return true;
  }, {
    message: "Penugasan gudang wajib diisi untuk peran WAREHOUSE",
    path: ["warehouseId"],
  });

const resetPasswordSchema = zod
  .object({
    password: zod.string().min(6, "Kata sandi minimal 6 karakter"),
    confirmPassword: zod.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

type CreateUserSchemaInput = zod.infer<typeof createUserSchema>;
type UpdateUserSchemaInput = zod.infer<typeof updateUserSchema>;
type ResetPasswordSchemaInput = zod.infer<typeof resetPasswordSchema>;

interface User {
  id: string;
  fullName: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  warehouseId?: string | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export default function UsersPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useGetUsersQuery({
    page,
    limit,
    search: search || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter || undefined,
  });

  const { data: warehouses = [] } = useGetWarehousesQuery();

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [updateUserStatus, { isLoading: isTogglingStatus }] = useUpdateUserStatusMutation();
  const [resetUserPassword, { isLoading: isResettingPassword }] = useResetUserPasswordMutation();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState<User | null>(null);

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    watch: watchAdd,
    formState: { errors: errorsAdd },
  } = useForm<CreateUserSchemaInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { isActive: true },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: errorsEdit },
  } = useForm<UpdateUserSchemaInput>({
    resolver: zodResolver(updateUserSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    reset: resetReset,
    formState: { errors: errorsReset },
  } = useForm<ResetPasswordSchemaInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const selectedRoleAdd = watchAdd("role");
  const selectedRoleEdit = watchEdit("role");

  const handleAdd = async (formData: CreateUserSchemaInput) => {
    try {
      await createUser(formData).unwrap();
      toast.success("Akun staf berhasil dibuat");
      setIsAddModalOpen(false);
      resetAdd();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Gagal membuat akun staf");
    }
  };

  const handleEdit = async (formData: UpdateUserSchemaInput) => {
    if (!editingUser) return;
    try {
      await updateUser({ id: editingUser.id, data: formData }).unwrap();
      toast.success("Profil staf berhasil diperbarui");
      setEditingUser(null);
      resetEdit();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Gagal memperbarui profil staf");
    }
  };

  const handleResetPassword = async (formData: ResetPasswordSchemaInput) => {
    if (!passwordResetUser) return;
    try {
      await resetUserPassword({ id: passwordResetUser.id, data: { password: formData.password, confirmPassword: formData.confirmPassword } }).unwrap();
      toast.success("Kata sandi staf berhasil disetel ulang");
      setPasswordResetUser(null);
      resetReset();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Gagal menyetel ulang kata sandi staf");
    }
  };

  const handleToggleStatus = async () => {
    if (!statusConfirmUser) return;
    try {
      const nextActive = !statusConfirmUser.isActive;
      await updateUserStatus({ id: statusConfirmUser.id, isActive: nextActive }).unwrap();
      toast.success(`Akun staf berhasil ${nextActive ? "diaktifkan" : "dinonaktifkan"}`);
      setStatusConfirmUser(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Gagal mengubah status akun staf");
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    resetEdit({
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      warehouseId: user.warehouseId || "",
    });
  };

  const users = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalItems: 0 };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={TEXT.users.title}
        description={TEXT.users.subtitle}
        actionButton={
          <Button onClick={() => setIsAddModalOpen(true)}>{TEXT.users.addBtn}</Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          placeholder="Cari berdasarkan nama atau username..."
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm w-full md:w-44"
          >
            <option value="">Semua Peran</option>
            <option value="ADMIN">ADMIN</option>
            <option value="CASHIER">CASHIER</option>
            <option value="KITCHEN">KITCHEN</option>
            <option value="WAREHOUSE">WAREHOUSE</option>
            <option value="ACCOUNTING">ACCOUNTING</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm w-full md:w-44"
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      </div>

      {!isLoading && users.length === 0 ? (
        <EmptyState title="Tidak ada staf ditemukan" description="Silakan cari nama staf lain atau sesuaikan filter Anda." />
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable headers={["Nama Lengkap", "Username", "Peran", "Gudang Tugas", "Status", "Tanggal Dibuat", TEXT.common.actions]} isLoading={isLoading}>
            {users.map((u: User) => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/20 transition">
                <td className="px-6 py-4 text-sm font-medium text-zinc-200">{u.fullName}</td>
                <td className="px-6 py-4 text-sm text-zinc-400">{u.username}</td>
                <td className="px-6 py-4 text-sm text-zinc-400 font-semibold uppercase">{u.role}</td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {u.role === "WAREHOUSE" ? u.warehouse?.name || "-" : u.role === "KITCHEN" ? "Akses: Penyimpanan Dapur (Kitchen)" : "-"}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge isActive={u.isActive} />
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {new Date(u.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </td>
                <td className="px-6 py-4 text-sm flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(u)}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    Ubah
                  </button>
                  <button
                    onClick={() => setPasswordResetUser(u)}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition"
                  >
                    Sandi
                  </button>
                  <button
                    onClick={() => setStatusConfirmUser(u)}
                    className="text-amber-400 hover:text-amber-300 font-medium transition"
                  >
                    {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <span className="text-sm text-zinc-400">
                Halaman {page} dari {pagination.totalPages} ({pagination.totalItems} staf)
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

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Pengguna Baru">
        <form onSubmit={handleSubmitAdd(handleAdd)} className="flex flex-col gap-4">
          <Input
            label="Nama Lengkap"
            placeholder="Masukkan nama lengkap staf"
            error={errorsAdd.fullName?.message}
            {...registerAdd("fullName")}
          />
          <Input
            label="Nama Pengguna (Username)"
            placeholder="Masukkan nama pengguna"
            error={errorsAdd.username?.message}
            {...registerAdd("username")}
          />
          <PasswordInput
            label="Kata Sandi"
            placeholder="Masukkan kata sandi staf"
            error={errorsAdd.password?.message}
            {...registerAdd("password")}
          />
          <PasswordInput
            label="Konfirmasi Kata Sandi"
            placeholder="Ketik ulang kata sandi staf"
            error={errorsAdd.confirmPassword?.message}
            {...registerAdd("confirmPassword")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Peran Akses</label>
            <select
              {...registerAdd("role")}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
            >
              <option value="">Pilih Peran</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CASHIER">CASHIER</option>
              <option value="KITCHEN">KITCHEN</option>
              <option value="WAREHOUSE">WAREHOUSE</option>
              <option value="ACCOUNTING">ACCOUNTING</option>
            </select>
            {errorsAdd.role?.message && (
              <span className="text-rose-500 text-xs font-medium">{errorsAdd.role.message}</span>
            )}
          </div>

          {selectedRoleAdd === "WAREHOUSE" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Penugasan Gudang</label>
              <select
                {...registerAdd("warehouseId")}
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
              >
                <option value="">Pilih Gudang...</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
              {errorsAdd.warehouseId?.message && (
                <span className="text-rose-500 text-xs font-medium">{errorsAdd.warehouseId.message}</span>
              )}
            </div>
          )}

          {selectedRoleAdd === "KITCHEN" && (
            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-400 text-xs font-semibold">
              ℹ️ Akses: Penyimpanan Dapur (Kitchen Storage)
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Simpan Staf
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editingUser !== null} onClose={() => setEditingUser(null)} title="Ubah Profil Staf">
        <form onSubmit={handleSubmitEdit(handleEdit)} className="flex flex-col gap-4">
          <Input
            label="Nama Lengkap"
            placeholder="Masukkan nama lengkap staf"
            error={errorsEdit.fullName?.message}
            {...registerEdit("fullName")}
          />
          <Input
            label="Nama Pengguna (Username)"
            placeholder="Masukkan nama pengguna"
            error={errorsEdit.username?.message}
            {...registerEdit("username")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Peran Akses</label>
            <select
              {...registerEdit("role")}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="CASHIER">CASHIER</option>
              <option value="KITCHEN">KITCHEN</option>
              <option value="WAREHOUSE">WAREHOUSE</option>
              <option value="ACCOUNTING">ACCOUNTING</option>
            </select>
            {errorsEdit.role?.message && (
              <span className="text-rose-500 text-xs font-medium">{errorsEdit.role.message}</span>
            )}
          </div>

          {selectedRoleEdit === "WAREHOUSE" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Penugasan Gudang</label>
              <select
                {...registerEdit("warehouseId")}
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition duration-200 text-sm"
              >
                <option value="">Pilih Gudang...</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
              {errorsEdit.warehouseId?.message && (
                <span className="text-rose-500 text-xs font-medium">{errorsEdit.warehouseId.message}</span>
              )}
            </div>
          )}

          {selectedRoleEdit === "KITCHEN" && (
            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-400 text-xs font-semibold">
              ℹ️ Akses: Penyimpanan Dapur (Kitchen Storage)
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="isActiveEdit"
              {...registerEdit("isActive")}
              className="w-4 h-4 accent-indigo-600 rounded bg-zinc-950 border-zinc-800 text-zinc-100"
            />
            <label htmlFor="isActiveEdit" className="text-sm font-medium text-zinc-300">
              Akun Aktif
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setEditingUser(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={passwordResetUser !== null} onClose={() => setPasswordResetUser(null)} title={`Setel Ulang Sandi Staf (${passwordResetUser?.username})`}>
        <form onSubmit={handleSubmitReset(handleResetPassword)} className="flex flex-col gap-4">
          <PasswordInput
            label="Kata Sandi Baru"
            placeholder="Masukkan kata sandi baru"
            error={errorsReset.password?.message}
            {...registerReset("password")}
          />
          <PasswordInput
            label="Konfirmasi Kata Sandi Baru"
            placeholder="Masukkan ulang kata sandi baru"
            error={errorsReset.confirmPassword?.message}
            {...registerReset("confirmPassword")}
          />

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setPasswordResetUser(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isResettingPassword}>
              Setel Ulang Kata Sandi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivate / Activate Dialog */}
      <ConfirmDialog
        isOpen={statusConfirmUser !== null}
        onClose={() => setStatusConfirmUser(null)}
        onConfirm={handleToggleStatus}
        title={statusConfirmUser?.isActive ? "Nonaktifkan Akun Staf" : "Aktifkan Akun Staf"}
        message={
          statusConfirmUser?.isActive
            ? `Apakah Anda yakin ingin menonaktifkan akun staf "${statusConfirmUser?.fullName}"? Staf ini tidak akan dapat masuk ke sistem POS/konsol tetapi seluruh logs audit/transaksi sejarah mereka akan tetap aman.`
            : `Apakah Anda yakin ingin mengaktifkan kembali akun staf "${statusConfirmUser?.fullName}"? Staf akan langsung dapat masuk ke area kerja sistem kembali.`
        }
        confirmText={statusConfirmUser?.isActive ? "Nonaktifkan Staf" : "Aktifkan Staf"}
        cancelText="Batal"
        variant="warning"
        isConfirming={isTogglingStatus}
      />
    </div>
  );
}
