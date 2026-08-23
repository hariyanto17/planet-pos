import { prisma } from "../../utils/prisma";
import { AppSettings } from "@shared/types";
import { AppError } from "../../utils/errorHandler";

let cachedSettings: AppSettings | null = null;

export const getSettings = async (): Promise<AppSettings> => {
  if (cachedSettings) {
    return cachedSettings;
  }

  const settings = await prisma.appSettings.findFirst({
    where: { id: "default-settings" }
  });

  if (!settings) {
    const mainWh = await prisma.warehouse.findFirst({ where: { warehouseType: "SALES" } });
    const kitchenWh = await prisma.warehouse.findFirst({ where: { warehouseType: "KITCHEN_STORAGE" } });

    const newSettings = await prisma.appSettings.create({
      data: {
        id: "default-settings",
        appName: "Planet Cinema",
        appType: "SELF_ORDER",
        timezone: "Asia/Makassar",
        locale: "id-ID",
        currency: "IDR",
        businessDayStartTime: "00:00",
        defaultWarehouseId: mainWh?.id || null,
        kitchenWarehouseId: kitchenWh?.id || null,
      }
    });

    cachedSettings = newSettings as unknown as AppSettings;
    return cachedSettings;
  }

  cachedSettings = settings as unknown as AppSettings;
  return cachedSettings;
};

export const updateSettings = async (input: Partial<AppSettings>): Promise<AppSettings> => {
  if (input.defaultWarehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: input.defaultWarehouseId } });
    if (!wh || !wh.isActive) {
      throw new AppError("BAD_REQUEST", "Default warehouse does not exist or is inactive");
    }
  }

  if (input.kitchenWarehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: input.kitchenWarehouseId } });
    if (!wh || !wh.isActive) {
      throw new AppError("BAD_REQUEST", "Kitchen warehouse does not exist or is inactive");
    }
  }

  const current = await getSettings();
  const targetAppType = input.appType ?? current.appType;
  const targetKitchenWarehouseId = input.kitchenWarehouseId !== undefined ? input.kitchenWarehouseId : current.kitchenWarehouseId;

  if (targetAppType === "CASHIER_ONLY" && !targetKitchenWarehouseId) {
    throw new AppError("BAD_REQUEST", "KITCHEN_WAREHOUSE_NOT_CONFIGURED");
  }

  const updated = await prisma.appSettings.update({
    where: { id: current.id },
    data: {
      appName: input.appName ?? current.appName,
      appType: (input.appType ?? current.appType) as any,
      timezone: input.timezone ?? current.timezone,
      locale: input.locale ?? current.locale,
      currency: input.currency ?? current.currency,
      businessDayStartTime: input.businessDayStartTime ?? current.businessDayStartTime,
      defaultWarehouseId: input.defaultWarehouseId !== undefined ? input.defaultWarehouseId : current.defaultWarehouseId,
      kitchenWarehouseId: input.kitchenWarehouseId !== undefined ? input.kitchenWarehouseId : current.kitchenWarehouseId,
    }
  });

  cachedSettings = updated as unknown as AppSettings;
  return cachedSettings;
};

export const clearSettingsCache = () => {
  cachedSettings = null;
};
