/**
 * Settings Context
 *
 * Manages application-wide settings with persistent storage.
 * Settings include font size, document path, and LLM API configuration.
 * All settings are automatically saved to storage.
 *
 * LEARNING NOTES - Similar pattern to ThemeContext:
 * This follows the same Context pattern as ThemeContext but manages
 * more complex state (an object with multiple fields instead of a boolean).
 *
 * KEY DIFFERENCES:
 * - Settings is an object (AppSettings type)
 * - updateSettings uses Partial<AppSettings> for flexible updates
 * - Merging strategy for defaults ensures backward compatibility
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_FONT_SIZE, STORAGE_KEY_APP_SETTINGS } from '../constants';
import { getItem, setItem } from '../services/storageService';

/**
 * Context value interface
 *
 * LEARNING NOTE - TypeScript Partial<T>:
 * Partial<AppSettings> means all fields are optional
 * Allows updateSettings({ fontSize: 16 }) without providing all fields
 */
interface SettingsContextType {
  /** Current settings object - all app settings in one place */
  settings: AppSettings;
  /** Update settings - merges new values with existing, auto-saves to storage */
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  /** Loading state - true while loading from storage on app startup */
  isLoading: boolean;
}

/**
 * Default settings applied on first launch or after reset
 *
 * LEARNING NOTE - Why defaults matter:
 * - First launch: No saved settings exist
 * - New fields: When we add new settings in updates
 * - Corrupted storage: Fallback if data is invalid
 */
const defaultSettings: AppSettings = {
  fontSize: DEFAULT_FONT_SIZE,
  isDarkMode: false,
  docsPath: '',         // Path to documents folder (Capacitor)
  llmApiUrl: '',        // LLM API endpoint for translations
  llmApiKey: '',        // API authentication key
  llmModel: '',         // Which LLM model to use
  targetLanguage: '',   // Language to translate to
  translationEnabled: true,
};

/**
 * Create the Settings Context
 *
 * PATTERN: Same as ThemeContext - undefined to catch missing Provider
 */
const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

/**
 * Settings Provider Component
 *
 * Wraps the app to provide settings context to all children.
 * Automatically loads settings from storage on mount.
 *
 * LEARNING NOTE - Similar structure to ThemeProvider:
 * - State for settings + loading
 * - useEffect to load on mount
 * - Functions to load/update
 * - Provider wrapper at the end
 */
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  /**
   * Settings state - holds all app settings
   * Initialized with defaults until loaded from storage
   */
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  /**
   * Loading state - prevents rendering until settings loaded
   */
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load settings on mount
   *
   * Same pattern as ThemeContext: useEffect with empty deps = run once on mount
   */
  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load settings from persistent storage
   *
   * LEARNING NOTE - Spread operator for merging:
   * { ...defaultSettings, ...stored }
   *
   * This creates a new object:
   * 1. Copy all fields from defaultSettings
   * 2. Overwrite with fields from stored (if they exist)
   *
   * BENEFIT: If we add new settings fields in an app update,
   * old saved data won't have them, but defaults will fill the gaps.
   *
   * EXAMPLE:
   * defaultSettings = { fontSize: 14, newField: 'default' }
   * stored = { fontSize: 16 }
   * result = { fontSize: 16, newField: 'default' }
   */
  const loadSettings = async () => {
    try {
      const stored = await getItem<AppSettings>(STORAGE_KEY_APP_SETTINGS);
      if (stored) {
        // Merge with defaults to ensure backward compatibility
        setSettings({ ...defaultSettings, ...stored });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Continue with defaults if loading fails
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update settings and persist to storage
   *
   * LEARNING NOTE - Partial updates:
   * This function accepts Partial<AppSettings>, meaning you can pass
   * just the fields you want to change:
   *
   * EXAMPLE:
   * updateSettings({ fontSize: 18 })  // Only updates fontSize
   * updateSettings({ llmApiKey: 'xyz', llmModel: 'gpt-4' }) // Updates multiple
   *
   * PATTERN: Optimistic updates (same as toggleTheme)
   * 1. Update local state immediately (UI responds instantly)
   * 2. Save to storage in background
   * 3. If save fails, state is already updated (graceful degradation)
   */
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      // Merge new settings with existing settings
      const updated = { ...settings, ...newSettings };
      setSettings(updated); // Update UI immediately
      await setItem(STORAGE_KEY_APP_SETTINGS, updated); // Persist to storage
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Don't revert state - keep UI consistent even if save fails
      // Could show a toast notification: "Settings updated but not saved"
    }
  };

  /**
   * Render the provider
   *
   * LEARNING NOTE - Provider value:
   * We expose three things to consuming components:
   * 1. settings - Current settings object (read)
   * 2. updateSettings - Function to change settings (write)
   * 3. isLoading - Whether initial load is complete
   *
   * Components can use these via: const { settings, updateSettings } = useSettings()
   */
  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Custom Hook to access settings context
 *
 * LEARNING NOTE - Same pattern as useTheme:
 * Wraps useContext with error checking for better DX (developer experience).
 *
 * USAGE in any component:
 * ```
 * const { settings, updateSettings } = useSettings();
 *
 * // Read settings
 * console.log(settings.fontSize);
 *
 * // Update settings
 * updateSettings({ fontSize: 18 });
 * ```
 *
 * @throws Error if used outside SettingsProvider
 * @returns Settings context with current settings and update function
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);

  /**
   * Error check: Ensure used within Provider
   * Same safety pattern as useTheme
   */
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }

  return context;
};
