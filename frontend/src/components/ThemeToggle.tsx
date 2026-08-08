"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../providers/ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getThemeIcon = (t: typeof theme) => {
    switch (t) {
      case "light":
        return <Sun className="w-4 h-4 text-amber-500 animate-pulse" />;
      case "dark":
        return <Moon className="w-4 h-4 text-indigo-400" />;
      default:
        return <Monitor className="w-4 h-4 text-text-secondary" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Ubah tema"
        className="flex items-center justify-center p-2 rounded-lg bg-surface-secondary hover:bg-surface border border-border text-text-primary transition duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-4 h-4 text-primary" />
        ) : (
          <Sun className="w-4 h-4 text-primary" />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-36 origin-top-right rounded-xl bg-surface border border-border shadow-xl focus:outline-none z-50 animate-in fade-in slide-in-from-top-1 duration-100"
        >
          <div className="p-1.5 flex flex-col gap-0.5">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                role="menuitem"
                onClick={() => {
                  setTheme(t);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition duration-150 capitalize ${
                  theme === t
                    ? "bg-primary-soft text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
                }`}
              >
                {getThemeIcon(t)}
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
