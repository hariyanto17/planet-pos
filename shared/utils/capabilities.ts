import { AppType } from "../types";

export function isSelfOrderEnabled(appType: AppType | string): boolean {
  return appType === AppType.SELF_ORDER;
}

export function isCashierOnly(appType: AppType | string): boolean {
  return appType === AppType.CASHIER_ONLY;
}

export function isKitchenWorkflowEnabled(appType: AppType | string): boolean {
  return appType === AppType.SELF_ORDER;
}

export function isKdsEnabled(appType: AppType | string): boolean {
  return appType === AppType.SELF_ORDER;
}

export function isSeparateKitchenRoleRequired(appType: AppType | string): boolean {
  return appType === AppType.SELF_ORDER;
}

export function canCashierAccessKitchenStorage(appType: AppType | string): boolean {
  return appType === AppType.CASHIER_ONLY;
}

export function isDirectCashierCompletionEnabled(appType: AppType | string): boolean {
  return appType === AppType.CASHIER_ONLY;
}
