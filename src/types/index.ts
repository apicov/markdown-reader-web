/**
 * Type Definitions
 *
 * Central type definitions for the application.
 * Defines interfaces for documents, settings, themes, and reading state.
 */

/**
 * Represents a document in the file system
 */
export interface Document {
  /** Unique identifier for the document (typically folder name) */
  id: string;
  /** Display title for the document */
  title: string;
  /** URI path to the folder containing the document */
  folderPath: string;
  /** URI path to the markdown file (lazy-loaded, may be empty initially) */
  markdownFile: string;
}

/**
 * Stores a user's reading position within a document
 */
export interface ReadingPosition {
  /** ID of the document this position belongs to */
  documentId: string;
  /** Vertical scroll offset in pixels */
  scrollOffset: number;
  /** Timestamp when this position was last saved */
  timestamp: number;
}

/**
 * Theme color scheme definition
 */
export interface Theme {
  /** Background color (hex or rgb) */
  background: string;
  /** Primary text color */
  text: string;
  /** Accent color for interactive elements */
  accent: string;
  /** Border and separator color */
  border: string;
}

/**
 * Application settings persisted across sessions
 */
export interface AppSettings {
  /** Font size in pixels for markdown content */
  fontSize: number;
  /** Whether dark mode is enabled */
  isDarkMode: boolean;
  /** Path to the documents directory on device */
  docsPath: string;
  /** LLM API endpoint URL for translation feature */
  llmApiUrl?: string;
  /** API key for LLM service authentication */
  llmApiKey?: string;
  /** Model name to use for LLM requests */
  llmModel?: string;
  /** Target language for translations */
  targetLanguage?: string;
  /** Whether translation feature is enabled */
  translationEnabled?: boolean;
}

/**
 * FSRS scheduling data for a card direction
 */
export interface FSRSData {
  /** Current memory stability (days until predicted recall probability drops below threshold) */
  stability: number;
  /** Card difficulty (intrinsic hardness, 0-10 scale) */
  difficulty: number;
  /** Days elapsed since last review */
  elapsed_days: number;
  /** Days scheduled for next review */
  scheduled_days: number;
  /** Number of times reviewed (total review count) */
  reps: number;
  /** Number of times failed (Again rating count) */
  lapses: number;
  /** Current FSRS state: 0=New, 1=Learning, 2=Review, 3=Relearning */
  state: number;
  /** Last review timestamp */
  last_review?: Date;
}

/**
 * Represents a flashcard deck
 */
export interface Deck {
  /** PouchDB document ID */
  _id: string;
  /** PouchDB revision */
  _rev?: string;
  /** Document type discriminator */
  type: 'deck';
  /** Deck name */
  name: string;
  /** Timestamp when deck was created */
  createdAt: number;
}

/**
 * Review direction for bidirectional cards
 */
export type ReviewDirection = 'forward' | 'reverse';

/**
 * Represents a flashcard
 */
export interface Card {
  /** PouchDB document ID */
  _id: string;
  /** PouchDB revision */
  _rev?: string;
  /** Document type discriminator */
  type: 'card';
  /** ID of the deck this card belongs to */
  deckId: string;
  /** Front of the card (word/phrase to recall) */
  front: string;
  /** Back of the card (translation/definition) */
  back: string;
  /** Source document ID (optional) */
  sourceDocId?: string;
  /** Whether to review in both directions */
  reviewBothDirections: boolean;
  /** FSRS scheduling data for each direction */
  fsrsData: {
    forward: FSRSData;
    reverse: FSRSData;
  };
  /** Timestamp when card was created */
  createdAt: number;
  /** Timestamp when card was last modified */
  updatedAt: number;
}

/**
 * Review rating options (FSRS standard)
 */
export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

/**
 * Card due for review with direction
 */
export interface ReviewCard {
  card: Card;
  direction: ReviewDirection;
  front: string;
  back: string;
}
