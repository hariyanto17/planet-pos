"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { useGetAppSettingsQuery, useUpdateAppSettingsMutation } from "@/lib/api/settingsApi";
import { useGetWarehousesListQuery } from "@/lib/api/warehousesApi";
import { AppType, AppSettings } from "@shared/types";
import { 
  isSelfOrderEnabled, 
  isKdsEnabled, 
  isKitchenWorkflowEnabled,
  canCashierAccessKitchenStorage
} from "@shared/utils/capabilities";

export default function ApplicationSettingsPage() {
  const toast = useToast();
  const { data: settings, isLoading: isSettingsLoading, refetch } = useGetAppSettingsQuery();
  const { data: warehousesData, isLoading: isWarehousesLoading } = useGetWarehousesListQuery({ limit: 100 });
  const [updateSettings, { isLoading: isUpdating }] = useUpdateAppSettingsMutation();

  const warehouses = warehousesData?.data || [];

  const { register, handleSubmit, reset, watch } = useForm<AppSettings>();

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const selectedAppType = watch("appType") || AppType.SELF_ORDER;

  const onSubmit = async (data: AppSettings) => {
    try {
      await updateSettings({
        appName: data.appName,
        appType: data.appType,
        timezone: data.timezone,
        locale: data.locale,
        currency: data.currency,
        businessDayStartTime: data.businessDayStartTime,
        defaultWarehouseId: data.defaultWarehouseId || null,
        kitchenWarehouseId: data.kitchenWarehouseId || null,
      }).unwrap();
      toast.success("Pengaturan aplikasi berhasil disimpan");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Gagal menyimpan pengaturan");
    }
  };

  if (isSettingsLoading || isWarehousesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-r-2 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <PageHeader
        title="Pengaturan Aplikasi"
        description="Konfigurasi model operasional bisnis, zona waktu, wilayah, mata uang, dan penyimpanan gudang."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Nama Aplikasi</label>
              <input
                type="text"
                {...register("appName")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Tipe Aplikasi</label>
              <select
                {...register("appType")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value={AppType.SELF_ORDER}>Self Order (Planet Cinema Model)</option>
                <option value={AppType.CASHIER_ONLY}>Cashier Only (Small Business Model)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Zona Waktu</label>
              <select
                {...register("timezone")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Wilayah (Locale)</label>
              <input
                type="text"
                {...register("locale")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Mata Uang (Currency)</label>
              <input
                type="text"
                {...register("currency")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Mulai Hari Operasional</label>
              <input
                type="text"
                placeholder="00:00"
                {...register("businessDayStartTime")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Gudang Default Penjualan</label>
              <select
                {...register("defaultWarehouseId")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="">Pilih Gudang Default</option>
                {warehouses.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Gudang Penyimpanan Dapur</label>
              <select
                {...register("kitchenWarehouseId")}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="">Pilih Penyimpanan Dapur</option>
                {warehouses.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Capabilities Preview Box */}
        <div className="bg-surface-secondary border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold tracking-wide uppercase text-text-primary">Preview Kapabilitas Sistem Operasional</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex justify-between p-3 bg-background rounded-lg border border-border/50">
              <span className="text-text-secondary">Self Order Pelanggan</span>
              <span className={`font-bold ${isSelfOrderEnabled(selectedAppType) ? "text-emerald-500" : "text-rose-500"}`}>
                {isSelfOrderEnabled(selectedAppType) ? "AKTIF" : "NONAKTIF"}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-background rounded-lg border border-border/50">
              <span className="text-text-secondary">Fulfillment KDS & Dapur KDS</span>
              <span className={`font-bold ${isKdsEnabled(selectedAppType) ? "text-emerald-500" : "text-rose-500"}`}>
                {isKdsEnabled(selectedAppType) ? "AKTIF" : "NONAKTIF"}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-background rounded-lg border border-border/50">
              <span className="text-text-secondary">Operator Dapur Terpisah</span>
              <span className={`font-bold ${isKitchenWorkflowEnabled(selectedAppType) ? "text-emerald-500" : "text-rose-500"}`}>
                {isKitchenWorkflowEnabled(selectedAppType) ? "DIBUTUHKAN" : "TIDAK DIBUTUHKAN"}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-background rounded-lg border border-border/50">
              <span className="text-text-secondary">Akses Stok Dapur oleh Kasir</span>
              <span className={`font-bold ${canCashierAccessKitchenStorage(selectedAppType) ? "text-emerald-500" : "text-amber-500"}`}>
                {canCashierAccessKitchenStorage(selectedAppType) ? "DIIZINKAN" : "HANYA KITCHEN/ADMIN"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit" isLoading={isUpdating} variant="primary">
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </div>
  );
}
