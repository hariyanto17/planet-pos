"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation, localeOptions } from "@/lib/i18n";
import { Globe, ChevronDown } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("common.selectLanguage", "Pilih Bahasa")}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface border border-border text-text-primary transition text-xs font-bold cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-text-secondary" />
        <span className="hidden sm:inline">{locale === "id" ? "ID" : "EN"}</span>
        <ChevronDown className="w-3 h-3 text-text-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl bg-surface border border-border shadow-xl z-50 p-1 flex flex-col gap-0.5 text-xs font-semibold">
          {localeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLocale(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition cursor-pointer text-left ${
                locale === opt.value
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
