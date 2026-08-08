import React, { createContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme, ThemeMode } from "./types";
import { lightTheme } from "./lightTheme";
import { darkTheme } from "./darkTheme";

const THEME_STORAGE_KEY = "@lontara_theme_mode";

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (e) {
        console.error("Failed to load theme preference", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Update resolved light/dark state when mode or system preferences change
  useEffect(() => {
    if (mode === "system") {
      setResolvedMode(systemColorScheme === "dark" ? "dark" : "light");
    } else {
      setResolvedMode(mode);
    }
  }, [mode, systemColorScheme]);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.error("Failed to persist theme preference", e);
    }
  };

  const toggleTheme = () => {
    const nextMode = resolvedMode === "light" ? "dark" : "light";
    setMode(nextMode);
  };

  const currentTheme = resolvedMode === "dark" ? darkTheme : lightTheme;

  // Render children normally once initialized
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        mode,
        resolvedMode,
        setMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
export default ThemeProvider;
