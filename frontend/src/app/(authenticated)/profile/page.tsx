"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCurrentUser } from "@/lib/store/features/auth/selectors";
import { useChangePasswordMutation } from "@/lib/api/authApi";
import { TEXT } from "@/lib/i18n/id";
import { useToast } from "@/components/ToastProvider";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/Button";

const changePasswordFormSchema = zod
  .object({
    currentPassword: zod.string().min(1, "Kata sandi saat ini wajib diisi"),
    newPassword: zod.string().min(6, "Kata sandi baru minimal 6 karakter"),
    confirmPassword: zod.string().min(1, "Konfirmasi kata sandi baru wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

type ChangePasswordFormInput = zod.infer<typeof changePasswordFormSchema>;

export default function ProfilePage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const toast = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  const onSubmit = async (data: ChangePasswordFormInput) => {
    try {
      await changePassword(data).unwrap();
      toast.success("Kata sandi Anda berhasil diperbarui");
      reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Gagal memperbarui kata sandi");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{TEXT.profile.title}</h1>
        <p className="text-zinc-400 text-sm">{TEXT.profile.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {currentUser ? (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800 pb-2">{TEXT.profile.detailsCardTitle}</h2>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{TEXT.profile.fullName}</span>
              <span className="text-zinc-100 text-sm font-medium">{currentUser.fullName}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{TEXT.profile.username}</span>
              <span className="text-zinc-100 text-sm font-medium">{currentUser.username}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{TEXT.profile.role}</span>
              <span className="text-zinc-100 text-sm font-medium capitalize">{currentUser.role}</span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-zinc-500">
            {TEXT.profile.noProfile}
          </div>
        )}

        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800 pb-2 mb-4">Ganti Kata Sandi</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <PasswordInput
              label="Kata Sandi Saat Ini"
              placeholder="Masukkan kata sandi saat ini"
              error={errors.currentPassword?.message}
              {...register("currentPassword")}
            />
            <PasswordInput
              label="Kata Sandi Baru"
              placeholder="Masukkan kata sandi baru"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <PasswordInput
              label="Konfirmasi Kata Sandi Baru"
              placeholder="Ketik ulang kata sandi baru"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button type="submit" isLoading={isLoading} className="w-full mt-2">
              Perbarui Kata Sandi
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
