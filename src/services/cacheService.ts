/**
 * Cache Service
 *
 * Provides caching utilities for expensive document processing operations.
 * Caches TOC, image paths, and other parsed data to improve document load times.
 */

import type { TocItem } from './tocService';
import { getItem, setItem, removeItem, keys } from './storageService';

const CACHE_PREFIX = '@markdown_cache_';
const CACHE_VERSION = '1';

export interface DocumentCache {
  version: string;
  documentId: string;
  contentHash: string;
  toc: TocItem[];
  imagePaths: string[];
  timestamp: number;
}

/**
 * Generate a simple hash from string content
 * Used to detect when document content has changed
 */
const generateHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Get cached document data if available and valid
 */
export const getCachedDocumentData = async (
  documentId: string,
  markdownContent: string
): Promise<DocumentCache | null> => {
  try {
    const cacheKey = `${CACHE_PREFIX}${documentId}`;
    const cached = await getItem<DocumentCache>(cacheKey);

    if (!cached) {
      console.log(`[Cache] MISS - No cache found for: ${documentId}`);
      return null;
    }

    // Validate cache version
    if (cached.version !== CACHE_VERSION) {
      console.log(`[Cache] MISS - Version mismatch for: ${documentId}`);
      return null;
    }

    // Validate content hasn't changed
    const currentHash = generateHash(markdownContent);
    if (cached.contentHash !== currentHash) {
      console.log(`[Cache] MISS - Content changed for: ${documentId}`);
      return null;
    }

    const cacheAge = (Date.now() - cached.timestamp) / 1000;
    console.log(`[Cache] HIT ✓ - Using cached data for: ${documentId} (age: ${cacheAge.toFixed(1)}s, ${cached.toc.length} headings, ${cached.imagePaths.length} images)`);
    return cached;
  } catch (error) {
    console.error('[Cache] ERROR - Failed to get cached data:', error);
    return null;
  }
};

/**
 * Cache document processing results
 */
export const cacheDocumentData = async (
  documentId: string,
  markdownContent: string,
  toc: TocItem[],
  imagePaths: string[]
): Promise<void> => {
  try {
    const cacheKey = `${CACHE_PREFIX}${documentId}`;
    const contentHash = generateHash(markdownContent);

    const cacheData: DocumentCache = {
      version: CACHE_VERSION,
      documentId,
      contentHash,
      toc,
      imagePaths,
      timestamp: Date.now(),
    };

    await setItem(cacheKey, cacheData);
    console.log(`[Cache] SAVED - Cached data for: ${documentId} (${toc.length} headings, ${imagePaths.length} images)`);
  } catch (error) {
    console.error('[Cache] ERROR - Failed to cache document data:', error);
  }
};

/**
 * Clear cache for a specific document
 */
export const clearDocumentCache = async (documentId: string): Promise<void> => {
  try {
    const cacheKey = `${CACHE_PREFIX}${documentId}`;
    await removeItem(cacheKey);
  } catch (error) {
    console.error('Failed to clear document cache:', error);
  }
};

/**
 * Clear all document caches
 */
export const clearAllCaches = async (): Promise<void> => {
  try {
    const allKeys = await keys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));

    await Promise.all(cacheKeys.map(key => removeItem(key)));
    console.log(`[Cache] Cleared ${cacheKeys.length} cached documents`);
  } catch (error) {
    console.error('Failed to clear all caches:', error);
  }
};
