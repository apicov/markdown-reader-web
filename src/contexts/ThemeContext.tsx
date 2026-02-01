/**
 * Theme Context
 *
 * Manages application theme (light/dark mode) using Material-UI's theming system.
 * Provides theme toggle and persists preference to storage.
 *
 * LEARNING NOTES - React Context Pattern:
 * Context solves the "prop drilling" problem. Instead of passing theme
 * settings through every component, we create a Context that any component
 * can access directly using the useTheme hook.
 *
 * STRUCTURE:
 * 1. Create Context with createContext()
 * 2. Create Provider component that wraps children
 * 3. Create custom hook (useTheme) for easy access
 * 4. Wrap app with Provider in App.tsx
 * 5. Use hook anywhere in component tree
 *
 * LEARNING NOTES - Material-UI Integration:
 * - MUI provides its own ThemeProvider
 * - We wrap it with our own Context for state management
 * - createTheme() generates a theme object based on our config
 * - CssBaseline applies consistent baseline styles
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getItem, setItem } from '../services/storageService';

/**
 * Storage key for persisting theme preference
 * Using constants prevents typos and makes refactoring easier
 */
const THEME_STORAGE_KEY = 'theme_mode';

/**
 * TypeScript interface defining the shape of our context value
 *
 * LEARNING NOTE - Interface vs Type:
 * Interfaces are preferred for object shapes that might be extended
 */
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

/**
 * Create the Context object
 *
 * LEARNING NOTE - undefined initial value:
 * We use undefined to detect when components try to use the context
 * outside of a Provider (see useTheme hook below)
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Component
 *
 * This is the Provider component that wraps the app and manages theme state.
 *
 * LEARNING NOTES - React.FC (FunctionComponent):
 * - React.FC is a TypeScript type for functional components
 * - { children: ReactNode } defines the props type
 * - children is a special prop containing nested components
 *
 * PATTERN: Loading state handling
 * - isLoading prevents flash of wrong theme on startup
 * - Waits for storage to load before rendering
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  /**
   * Theme mode state
   * false = light mode, true = dark mode
   */
  const [isDarkMode, setIsDarkMode] = useState(false);

  /**
   * Loading state to prevent flash of unstyled content
   * Stays true until theme preference is loaded from storage
   */
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load theme preference on component mount
   *
   * LEARNING NOTE - useEffect with empty dependency array:
   * useEffect(() => {...}, []) runs ONCE when component mounts
   * Similar to componentDidMount in class components
   *
   * USE CASE: Initial data loading, subscriptions, event listeners
   */
  useEffect(() => {
    loadThemePreference();
  }, []);

  /**
   * Load theme preference from persistent storage
   *
   * LEARNING NOTE - async/await pattern:
   * Storage operations are asynchronous (might use filesystem or database)
   * async/await makes asynchronous code look synchronous and readable
   *
   * PATTERN: Error handling with try/catch/finally
   * - try: Attempt the operation
   * - catch: Handle errors gracefully
   * - finally: Always run (set loading to false regardless of success/failure)
   */
  const loadThemePreference = async () => {
    try {
      const stored = await getItem<boolean>(THEME_STORAGE_KEY);
      if (stored !== null) {
        setIsDarkMode(stored);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      // Continue with default (light) theme if loading fails
    } finally {
      setIsLoading(false); // Stop loading spinner regardless of success/failure
    }
  };

  /**
   * Toggle between light and dark mode
   *
   * PATTERN: Optimistic updates
   * - Update UI immediately (setIsDarkMode)
   * - Save to storage in background
   * - If save fails, UI still works (we just lose persistence)
   */
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode); // Update UI immediately
    try {
      await setItem(THEME_STORAGE_KEY, newMode); // Persist to storage
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Could add a toast notification here
    }
  };

  /**
   * Create Material-UI theme object
   *
   * LEARNING NOTE - useMemo hook:
   * useMemo caches the result of an expensive calculation.
   * Only recalculates when dependencies change (isDarkMode in this case).
   *
   * WHY: createTheme() creates a large object with many properties.
   * Without useMemo, we'd recreate it on every render (wasteful).
   * With useMemo, we only recreate when isDarkMode changes.
   *
   * SYNTAX: useMemo(() => expensiveCalculation(), [dependencies])
   *
   * MATERIAL-UI THEME STRUCTURE:
   * - palette: Colors for different UI elements
   * - typography: Font settings
   * - spacing, breakpoints, shadows, etc. (not shown here)
   */
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light', // MUI automatically adjusts many colors based on mode
          primary: {
            main: isDarkMode ? '#ff6b6b' : '#1976d2', // Main brand color
          },
          background: {
            default: isDarkMode ? '#000000' : '#ffffff', // Page background
            paper: isDarkMode ? '#1a1a1a' : '#f5f5f5',   // Card/surface background
          },
          text: {
            primary: isDarkMode ? '#ff0000' : '#000000',   // Primary text color
            secondary: isDarkMode ? '#cc0000' : '#666666', // Secondary/muted text
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      }),
    [isDarkMode] // Only recreate theme when isDarkMode changes
  );

  /**
   * Don't render anything until theme is loaded
   * Prevents flash of wrong theme
   */
  if (isLoading) {
    return null; // Could show a loading spinner here instead
  }

  /**
   * Render the provider tree
   *
   * STRUCTURE (nested providers):
   * 1. ThemeContext.Provider - Our custom context (isDarkMode, toggleTheme)
   * 2. MuiThemeProvider - Material-UI's provider (theme object)
   * 3. CssBaseline - Applies baseline CSS reset/normalization
   * 4. children - The rest of the app
   *
   * LEARNING NOTE - value prop:
   * The value prop of Context.Provider is what consumers will receive
   * when they call useContext(ThemeContext) or our useTheme() hook
   */
  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline /> {/* Applies consistent base styles (CSS reset) */}
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Custom Hook to access theme context
 *
 * LEARNING NOTE - Custom Hooks:
 * Custom hooks are functions that start with "use" and can call other hooks.
 * They let you extract reusable logic from components.
 *
 * PATTERN: Context consumer hook
 * Instead of making components call useContext(ThemeContext) directly,
 * we create a custom hook that:
 * 1. Calls useContext for us
 * 2. Adds error handling (checks if Provider exists)
 * 3. Provides better TypeScript types
 *
 * USAGE in any component:
 * ```
 * const { isDarkMode, toggleTheme } = useTheme();
 * ```
 *
 * @throws Error if used outside ThemeProvider
 * @returns Theme context with mode and toggle function
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  /**
   * Error check: Ensure hook is used within Provider
   *
   * Without this check, we'd get undefined which could cause crashes.
   * This gives a clear error message if someone forgets to wrap with ThemeProvider.
   */
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
