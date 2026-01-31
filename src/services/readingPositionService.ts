/**
 * Reading Position Service
 *
 * Manages persistent storage of reading positions for documents.
 * Tracks scroll offset to restore user's exact reading position
 * when reopening a document.
 */

import type { ReadingPosition } from '../types';
import { STORAGE_KEY_READING_POSITIONS } from '../constants';
import { getItem, setItem } from './storageService';

/**
 * Save the current reading position for a document
 *
 * Stores scroll offset to restore position later.
 * Overwrites any existing position for the same document.
 *
 * @param documentId - Unique identifier for the document
 * @param scrollOffset - Vertical scroll position in pixels
 */
export const saveReadingPosition = async (
  documentId: string,
  scrollOffset: number,
): Promise<void> => {
  try {
    const positions = await getAllReadingPositions();

    // Update or create position entry for this document
    positions[documentId] = {
      documentId,
      scrollOffset,
      timestamp: Date.now(),
    };

    await setItem(STORAGE_KEY_READING_POSITIONS, positions);
  } catch (error) {
    console.error('Failed to save reading position:', error);
    // Fail silently - don't disrupt user experience for storage errors
  }
};

/**
 * Retrieve the saved reading position for a document
 *
 * @param documentId - Unique identifier for the document
 * @returns The saved position, or null if none exists or on error
 */
export const getReadingPosition = async (
  documentId: string,
): Promise<ReadingPosition | null> => {
  try {
    const positions = await getAllReadingPositions();
    return positions[documentId] || null;
  } catch (error) {
    console.error('Failed to get reading position:', error);
    return null;
  }
};

/**
 * Retrieve all saved reading positions
 *
 * Internal helper function to fetch the entire positions map from storage.
 *
 * @returns Map of document IDs to reading positions, empty object on error
 */
const getAllReadingPositions = async (): Promise<{
  [key: string]: ReadingPosition;
}> => {
  try {
    const stored = await getItem<{ [key: string]: ReadingPosition }>(
      STORAGE_KEY_READING_POSITIONS
    );
    return stored || {};
  } catch (error) {
    console.error('Failed to get all reading positions:', error);
    return {};
  }
};
