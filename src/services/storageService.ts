/**
 * Storage Service
 *
 * Provides persistent storage using Capacitor Preferences (for mobile)
 * and localStorage (for web fallback).
 *
 * Capacitor Preferences API works on both web and native platforms.
 */

import { Preferences } from '@capacitor/preferences';

/**
 * Save a value to persistent storage
 *
 * @param key - Storage key
 * @param value - Value to store (will be JSON stringified)
 */
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await Preferences.set({ key, value: stringValue });
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    throw error;
  }
};

/**
 * Retrieve a value from persistent storage
 *
 * @param key - Storage key
 * @returns Stored value (parsed from JSON if applicable), or null if not found
 */
export const getItem = async <T = any>(key: string): Promise<T | null> => {
  try {
    const { value } = await Preferences.get({ key });

    if (value === null || value === undefined) {
      return null;
    }

    // Try to parse as JSON, return as-is if parsing fails
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    console.error(`Failed to get ${key}:`, error);
    return null;
  }
};

/**
 * Remove a value from persistent storage
 *
 * @param key - Storage key to remove
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
 * @returns Array of all storage keys
 */
export const keys = async (): Promise<string[]> => {
  try {
    const { keys: storageKeys } = await Preferences.keys();
    return storageKeys;
  } catch (error) {
    console.error('Failed to get keys:', error);
    return [];
  }
};
