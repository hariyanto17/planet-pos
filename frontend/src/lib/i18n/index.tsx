"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TEXT as textId } from "./id";
import { TEXT as textEn } from "./en";

export type Locale = "id" | "en";

export const locales = {
  id: textId,
  en: textEn,
} as const;

export const defaultLocale: Locale = "id";

export const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: "id", label: "🇮🇩 Bahasa Indonesia" },
  { value: "en", label: "🇬🇧 English" },
];

export const getLocaleLabel = (locale: Locale) =>
  localeOptions.find((option) => option.value === locale)?.label || "🇮🇩 Bahasa Indonesia";

const STORAGE_KEY = "concession_language";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  text: typeof textId;
  t: (key: string, fallback?: string) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  localeLabel: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  const segments = key.split(".");
  let current: unknown = obj;

  for (const segment of segments) {
    if (current == null || typeof current !== "object" || !(segment in (current as Record<string, unknown>))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const savedLocale = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (savedLocale === "id" || savedLocale === "en") {
        return savedLocale;
      }
    }
    return defaultLocale;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  };

  const text = useMemo(() => locales[locale] || locales.id, [locale]);

  const t = (key: string, fallback?: string) => {
    const dictionary = locales[locale] || locales.id;
    const value = getNestedValue(dictionary as unknown as Record<string, unknown>, key) ?? fallback ?? key;
    return value;
  };

  const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const dateValue = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", options).format(dateValue);
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", options).format(value);

  const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
      ...options,
    }).format(value);

  const localeLabel = useMemo(() => getLocaleLabel(locale), [locale]);

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, text, t, formatDate, formatNumber, formatCurrency, localeLabel }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback when accessed outside of provider
    return {
      locale: "id" as Locale,
      setLocale: () => {},
      text: textId,
      t: (key: string, fallback?: string) => fallback || key,
      formatDate: (val: string | Date) => new Date(val).toLocaleDateString(),
      formatNumber: (val: number) => String(val),
      formatCurrency: (val: number) => `Rp ${val.toLocaleString()}`,
      localeLabel: "🇮🇩 Bahasa Indonesia",
    };
  }
  return context;
}

export { textId, textEn };
