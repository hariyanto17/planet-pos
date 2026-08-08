"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "system";
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      let isDark = false;
      if (theme === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } else {
        isDark = theme === "dark";
      }

      if (isDark) {
        root.classList.add("dark");
        setResolvedTheme("dark");
      } else {
        root.classList.remove("dark");
        setResolvedTheme("light");
      }
    };

    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme();
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
