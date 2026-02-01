/**
 * Storage Service
 *
 * Wrapper around Capacitor Preferences API for persistent key-value storage.
 *
 * LEARNING NOTES - Capacitor Preferences:
 * Capacitor's cross-platform storage solution:
 * - Web: Uses localStorage
 * - iOS: Uses UserDefaults
 * - Android: Uses SharedPreferences
 *
 * Same API, works everywhere!
 *
 * LEARNING NOTES - Service Pattern:
 * Instead of calling Capacitor APIs directly in components,
 * we create a service layer that:
 * - Provides a simpler API
 * - Handles serialization/deserialization automatically
 * - Centralizes error handling
 * - Makes testing easier (can mock the service)
 *
 * WHY ASYNC: Storage operations might be slow on some platforms,
 * so all operations are asynchronous (return Promises)
 */

import { Preferences } from '@capacitor/preferences';

/**
 * Save a value to persistent storage
 *
 * LEARNING NOTE - Generic storage:
 * Can store any type: objects, arrays, strings, numbers, booleans
 * Automatically serializes to JSON for complex types
 *
 * @param key - Storage key (like a filename)
 * @param value - Value to store (any type)
 *
 * @example
 * await setItem('user', { name: 'Alice', age: 30 });
 * await setItem('theme', 'dark');
 * await setItem('count', 42);
 */
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    /**
     * Convert value to string
     *
     * LEARNING NOTE - Type checking:
     * Preferences.set() only accepts strings.
     * - If already string: use as-is
     * - If object/array/etc: convert to JSON
     */
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    /**
     * CAPACITOR API: Preferences.set()
     * Saves key-value pair to platform-specific storage
     */
    await Preferences.set({ key, value: stringValue });
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    throw error; // Re-throw so caller can handle
  }
};

/**
 * Retrieve a value from persistent storage
 *
 * LEARNING NOTE - TypeScript Generics in functions:
 * <T = any> means:
 * - T is a type parameter (caller can specify what type to expect)
 * - Defaults to 'any' if not specified
 *
 * USAGE:
 * const user = await getItem<User>('user');       // TypeScript knows result is User | null
 * const theme = await getItem<string>('theme');   // TypeScript knows result is string | null
 * const count = await getItem('count');           // Falls back to 'any'
 *
 * @param key - Storage key
 * @returns Stored value (auto-parsed from JSON), or null if not found
 */
export const getItem = async <T = any>(key: string): Promise<T | null> => {
  try {
    /**
     * CAPACITOR API: Preferences.get()
     * Returns { value: string | null }
     */
    const { value } = await Preferences.get({ key });

    // Nothing stored at this key
    if (value === null || value === undefined) {
      return null;
    }

    /**
     * Try to parse as JSON
     *
     * PATTERN: Graceful JSON parsing
     * - Most values are JSON (objects, arrays, numbers)
     * - Some might be plain strings
     * - Try JSON.parse first, fall back to raw string
     *
     * LEARNING NOTE - Nested try-catch:
     * Inner try-catch handles just JSON parsing errors
     * Outer try-catch handles Preferences API errors
     */
    try {
      return JSON.parse(value) as T;
    } catch {
      // Not JSON, return as-is
      return value as T;
    }
  } catch (error) {
    console.error(`Failed to get ${key}:`, error);
    return null; // Return null on error (graceful degradation)
  }
};

/**
 * Remove a value from persistent storage
 *
 * @param key - Storage key to remove
 *
 * @example
 * await removeItem('theme'); // Deletes the 'theme' key
 */
export const removeItem = async (key: string): Promise<void> => {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error);
    throw error;
  }
};

/**
 * Clear all values from persistent storage
 *
 * CAUTION: This deletes ALL app data!
 * Use for logout, reset, or debugging
 *
 * @example
 * await clear(); // Deletes everything
 */
export const clear = async (): Promise<void> => {
  try {
    await Preferences.clear();
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
};

/**
 * Get all keys from storage
 *
 * Useful for debugging or building export features
 *
 * @returns Array of all storage keys
 *
 * @example
 * const allKeys = await keys();
 * console.log('Stored keys:', allKeys);
 * // Output: ['theme', 'settings', 'user', 'app_settings']
 */
export const keys = async (): Promise<string[]> => {
  try {
    /**
     * CAPACITOR API: Preferences.keys()
     * Returns { keys: string[] }
     *
     * LEARNING NOTE - Destructuring with rename:
     * { keys: storageKeys } means:
     * - Extract 'keys' property from return value
     * - Rename it to 'storageKeys' to avoid confusion with function name
     */
    const { keys: storageKeys } = await Preferences.keys();
    return storageKeys;
  } catch (error) {
    console.error('Failed to get keys:', error);
    return []; // Return empty array on error
  }
};
