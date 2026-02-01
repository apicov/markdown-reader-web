/**
 * Anki Export Service
 *
 * Exports flashcard decks to Anki-compatible TSV format.
 * The format is tab-separated values with front and back of each card.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { cardDb } from './cardDatabaseService';

/**
 * Export a deck to Anki-compatible TSV format
 * @param deckId - ID of the deck to export
 * @returns TSV content as a string
 */
export async function exportDeckToAnki(deckId: string): Promise<string> {
  const deck = await cardDb.getDeck(deckId);
  if (!deck) {
    throw new Error('Deck not found');
  }

  const cards = await cardDb.getCardsByDeck(deckId);

  // Generate TSV content
  // Anki format: front<tab>back
  const lines: string[] = [];

  for (const card of cards) {
    // Escape tabs and newlines in card content
    const escapedFront = escapeForTSV(card.front);
    const escapedBack = escapeForTSV(card.back);

    lines.push(`${escapedFront}\t${escapedBack}`);
  }

  return lines.join('\n');
}

/**
 * Escape special characters for TSV format
 */
function escapeForTSV(text: string): string {
  // Replace literal tabs with spaces
  let escaped = text.replace(/\t/g, '    ');

  // Replace newlines with HTML <br> tags (Anki supports HTML)
  escaped = escaped.replace(/\n/g, '<br>');

  return escaped;
}

/**
 * Download a deck as an Anki TSV file
 * @param deckId - ID of the deck to export
 */
export async function downloadDeckAsAnki(deckId: string): Promise<void> {
  const deck = await cardDb.getDeck(deckId);
  if (!deck) {
    throw new Error('Deck not found');
  }

  const tsvContent = await exportDeckToAnki(deckId);
  const filename = `${sanitizeFilename(deck.name)}.txt`;

  // Check if running on native platform
  if (Capacitor.isNativePlatform()) {
    // Use Capacitor Filesystem API for mobile
    try {
      await Filesystem.writeFile({
        path: filename,
        data: tsvContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      alert(`Deck exported successfully to Documents/${filename}`);
    } catch (error) {
      console.error('Failed to write file:', error);
      throw new Error('Failed to save file to device');
    }
  } else {
    // Use browser download for web
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9_\-]/gi, '_');
}

/**
 * Import a deck from Anki TSV format
 * @param deckName - Name for the new deck (or existing deck to add to)
 * @param tsvContent - TSV content to import
 * @param createNewDeck - Whether to create a new deck or prompt for selection
 * @returns The deck ID that cards were imported into
 */
export async function importDeckFromAnki(
  deckName: string,
  tsvContent: string
): Promise<string> {
  // Get or create the deck
  const deck = await cardDb.getOrCreateDeck(deckName);

  // Parse TSV content
  const lines = tsvContent.split('\n').filter(line => line.trim());
  let importedCount = 0;

  for (const line of lines) {
    // Split by tab
    const parts = line.split('\t');
    if (parts.length < 2) continue; // Skip invalid lines

    const front = unescapeFromTSV(parts[0].trim());
    const back = unescapeFromTSV(parts[1].trim());

    if (!front || !back) continue; // Skip empty cards

    // Create the card (reviewBothDirections defaults to false for imports)
    await cardDb.createCard(deck._id, front, back, false);
    importedCount++;
  }

  return deck._id;
}

/**
 * Unescape special characters from TSV format
 */
function unescapeFromTSV(text: string): string {
  // Convert HTML <br> tags back to newlines
  let unescaped = text.replace(/<br\s*\/?>/gi, '\n');

  return unescaped;
}

/**
 * Import deck from file on native platform
 * Uses file picker to select a TSV file and imports it
 */
export async function importDeckFromFile(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('File picker is only available on native platforms');
  }

  try {
    // For web fallback or future implementation, we'll use input element
    // On native, we'd use a file picker plugin
    throw new Error('File picker not yet implemented for native platform');
  } catch (error) {
    console.error('Failed to pick file:', error);
    throw error;
  }
}
