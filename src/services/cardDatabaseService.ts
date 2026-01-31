/**
 * Card Database Service
 *
 * Manages PouchDB database for flashcards and decks.
 * Handles CRUD operations for cards and decks with proper indexing.
 */

import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';
import type { Card, Deck, ReviewDirection } from '../types';

// Add the find plugin to PouchDB
PouchDB.plugin(PouchDBFind);

const DB_NAME = 'markdown-reader-cards';

class CardDatabaseService {
  private db: PouchDB.Database;

  constructor() {
    this.db = new PouchDB(DB_NAME);
    this.initializeIndexes();
  }

  private async initializeIndexes() {
    try {
      // Index for querying decks
      await this.db.createIndex({
        index: { fields: ['type', 'createdAt'] },
      });

      // Index for querying cards by deck
      await this.db.createIndex({
        index: { fields: ['type', 'deckId', 'createdAt'] },
      });
    } catch (error) {
      console.error('Failed to create indexes:', error);
    }
  }

  // ===== DECK OPERATIONS =====

  /**
   * Create a new deck
   */
  async createDeck(name: string): Promise<Deck> {
    const deck: Deck = {
      _id: `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'deck',
      name,
      createdAt: Date.now(),
    };

    const result = await this.db.put(deck);
    return { ...deck, _rev: result.rev };
  }

  /**
   * Get all decks
   */
  async getAllDecks(): Promise<Deck[]> {
    const result = await this.db.find({
      selector: { type: 'deck' },
      sort: [{ type: 'desc' }, { createdAt: 'desc' }],
    });

    return result.docs as Deck[];
  }

  /**
   * Get deck by ID
   */
  async getDeck(deckId: string): Promise<Deck | null> {
    try {
      const doc = await this.db.get(deckId);
      if (doc && (doc as any).type === 'deck') {
        return doc as Deck;
      }
      return null;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get or create deck by name (useful for auto-creating decks from document names)
   */
  async getOrCreateDeck(name: string): Promise<Deck> {
    const allDecks = await this.getAllDecks();
    const existing = allDecks.find((d) => d.name === name);

    if (existing) {
      return existing;
    }

    return this.createDeck(name);
  }

  /**
   * Update deck name
   */
  async updateDeck(deckId: string, name: string): Promise<Deck> {
    const deck = await this.db.get(deckId) as Deck;
    deck.name = name;
    const result = await this.db.put(deck);
    return { ...deck, _rev: result.rev };
  }

  /**
   * Delete deck and all its cards
   */
  async deleteDeck(deckId: string): Promise<void> {
    // Delete all cards in the deck
    const cards = await this.getCardsByDeck(deckId);
    const deletions = cards.map((card) => ({
      ...card,
      _deleted: true,
    }));

    if (deletions.length > 0) {
      await this.db.bulkDocs(deletions);
    }

    // Delete the deck itself
    const deck = await this.db.get(deckId);
    await this.db.remove(deck);
  }

  /**
   * Get card count for a deck
   */
  async getDeckCardCount(deckId: string): Promise<number> {
    const result = await this.db.find({
      selector: { type: 'card', deckId },
      fields: ['_id'],
    });

    return result.docs.length;
  }

  // ===== CARD OPERATIONS =====

  /**
   * Create a new card
   */
  async createCard(
    deckId: string,
    front: string,
    back: string,
    reviewBothDirections: boolean,
    sourceDocId?: string
  ): Promise<Card> {
    // Initialize with new card state (FSRS state: 0 = New)
    const initialFSRS = {
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: undefined,
    };

    const card: Card = {
      _id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'card',
      deckId,
      front,
      back,
      sourceDocId,
      reviewBothDirections,
      fsrsData: {
        forward: { ...initialFSRS },
        reverse: { ...initialFSRS },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = await this.db.put(card);
    return { ...card, _rev: result.rev };
  }

  /**
   * Get card by ID
   */
  async getCard(cardId: string): Promise<Card | null> {
    try {
      const doc = await this.db.get(cardId);
      if (doc && (doc as any).type === 'card') {
        return doc as Card;
      }
      return null;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update card
   */
  async updateCard(card: Card): Promise<Card> {
    card.updatedAt = Date.now();
    const result = await this.db.put(card);
    return { ...card, _rev: result.rev };
  }

  /**
   * Delete card
   */
  async deleteCard(cardId: string): Promise<void> {
    const card = await this.db.get(cardId);
    await this.db.remove(card);
  }

  /**
   * Get all cards in a deck
   */
  async getCardsByDeck(deckId: string): Promise<Card[]> {
    const result = await this.db.find({
      selector: { type: 'card', deckId },
      sort: [{ type: 'desc' }, { deckId: 'desc' }, { createdAt: 'desc' }],
    });

    return result.docs as Card[];
  }

  /**
   * Get cards due for review in a deck
   * Returns cards where the next review date is today or earlier
   * Cards are shuffled so forward/reverse from the same card aren't adjacent
   */
  async getDueCards(deckId: string): Promise<Array<{ card: Card; direction: ReviewDirection }>> {
    const allCards = await this.getCardsByDeck(deckId);
    const now = new Date();
    const dueCards: Array<{ card: Card; direction: ReviewDirection }> = [];

    for (const card of allCards) {
      // Check forward direction
      const forwardDue = this.isCardDue(card.fsrsData.forward, now);
      if (forwardDue) {
        dueCards.push({ card, direction: 'forward' });
      }

      // Check reverse direction (only if enabled)
      if (card.reviewBothDirections) {
        const reverseDue = this.isCardDue(card.fsrsData.reverse, now);
        if (reverseDue) {
          dueCards.push({ card, direction: 'reverse' });
        }
      }
    }

    // Shuffle using Fisher-Yates algorithm to avoid showing forward/reverse consecutively
    for (let i = dueCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dueCards[i], dueCards[j]] = [dueCards[j], dueCards[i]];
    }

    return dueCards;
  }

  /**
   * Check if a card direction is due for review
   */
  private isCardDue(fsrsData: Card['fsrsData']['forward'], now: Date): boolean {
    // New cards (never reviewed) are always due
    if (!fsrsData.last_review) {
      return true;
    }

    // Calculate next review date
    const lastReview = new Date(fsrsData.last_review);
    const nextReviewDate = new Date(lastReview.getTime() + fsrsData.scheduled_days * 24 * 60 * 60 * 1000);

    return now >= nextReviewDate;
  }

  /**
   * Get new cards count (cards never reviewed)
   */
  async getNewCardsCount(deckId: string): Promise<number> {
    const cards = await this.getCardsByDeck(deckId);
    let count = 0;

    for (const card of cards) {
      if (!card.fsrsData.forward.last_review) {
        count++;
      }
      if (card.reviewBothDirections && !card.fsrsData.reverse.last_review) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get due cards count
   */
  async getDueCardsCount(deckId: string): Promise<number> {
    const dueCards = await this.getDueCards(deckId);
    return dueCards.length;
  }

  /**
   * Clear all data (for testing/development)
   */
  async clearAll(): Promise<void> {
    await this.db.destroy();
    this.db = new PouchDB(DB_NAME);
    await this.initializeIndexes();
  }
}

// Export singleton instance
export const cardDb = new CardDatabaseService();
