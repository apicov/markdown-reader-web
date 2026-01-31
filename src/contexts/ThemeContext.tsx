/**
 * Theme Context
 *
 * Manages application theme (light/dark mode) using Material-UI's theming system.
 * Provides theme toggle and persists preference to storage.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getItem, setItem } from '../services/storageService';

const THEME_STORAGE_KEY = 'theme_mode';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Component
 *
 * Wraps the app to provide Material-UI theme based on dark/light mode preference.
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const stored = await getItem<boolean>(THEME_STORAGE_KEY);
      if (stored !== null) {
        setIsDarkMode(stored);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Create Material-UI theme based on mode
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: isDarkMode ? '#ff6b6b' : '#1976d2',
          },
          background: {
            default: isDarkMode ? '#000000' : '#ffffff',
            paper: isDarkMode ? '#1a1a1a' : '#f5f5f5',
          },
          text: {
            primary: isDarkMode ? '#ff0000' : '#000000',
            secondary: isDarkMode ? '#cc0000' : '#666666',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      }),
    [isDarkMode]
  );

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 *
 * @throws Error if used outside ThemeProvider
 * @returns Theme context with mode and toggle function
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
