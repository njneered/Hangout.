/**
 * providers/ThemeProvider.tsx
 * ─────────────────────────────────────────────────────────────
 * Wraps the app and provides the current theme + toggle.
 * Persists the user's preference to AsyncStorage so it
 * survives app restarts without needing a Supabase call.
 *
 * SETUP:
 *   1. Install: npx expo install @react-native-async-storage/async-storage
 *   2. Wrap your app in app/_layout.tsx:
 *        import { ThemeProvider } from '@/providers/ThemeProvider';
 *        // Inside RootNavigator return:
 *        <ThemeProvider>
 *          <Stack ...>
 *        </ThemeProvider>
 *
 * USAGE in any screen/component:
 *   import { useTheme } from '@/providers/ThemeProvider';
 *   const { theme, isDark, toggleTheme } = useTheme();
 *   // Use theme.bg, theme.gold, theme.text etc. instead of hardcoded THEME object
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DARK_THEME, LIGHT_THEME, AppTheme } from '@/constants/theme';

const STORAGE_KEY = 'hangout_theme_preference';

interface ThemeContextValue {
  theme:       AppTheme;
  isDark:      boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:       DARK_THEME,
  isDark:      true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val !== null) setIsDark(val === 'dark');
    });
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
  }

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}