import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { darkColors, lightColors, type AppColors } from './colors';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
};

const THEME_KEY = 'alassas-theme-mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;

    const loadMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (!mounted) return;
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved);
        }
      } catch {
        // Keep light mode if persisted value is unavailable.
      }
    };

    void loadMode();

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, nextMode);
    } catch {
      // Best-effort persistence.
    }
  }, []);

  const toggleMode = useCallback(async () => {
    await setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: mode === 'dark' ? darkColors : lightColors,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = React.use(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return ctx;
}
