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
