/**
 * FSRS Scheduler Service
 *
 * Integrates ts-fsrs library for spaced repetition scheduling.
 * Handles card review scheduling and rating updates.
 */

import { FSRS, Rating as FSRSRating, State } from 'ts-fsrs';
import type { Card, Rating, ReviewDirection, FSRSData } from '../types';
import { cardDb } from './cardDatabaseService';

// Define FSRSCard type based on ts-fsrs structure
interface FSRSCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: Date;
  learning_steps: number;
}

// Type for accessing FSRS scheduling results
// ts-fsrs returns IPreview which uses string keys ('again', 'hard', 'good', 'easy')
interface FSRSSchedulingResult {
  again: { card: FSRSCard };
  hard: { card: FSRSCard };
  good: { card: FSRSCard };
  easy: { card: FSRSCard };
}

class FSRSService {
  private fsrs: FSRS;

  constructor() {
    // Initialize FSRS with default parameters
    // These can be customized based on user performance data later
    this.fsrs = new FSRS({
      enable_short_term: false, // Use standard long-term memory model
    });
  }

  /**
   * Convert our FSRSData to ts-fsrs Card format
   */
  private toFSRSCard(fsrsData: FSRSData): FSRSCard {
    return {
      due: fsrsData.last_review ? new Date(fsrsData.last_review) : new Date(),
      stability: fsrsData.stability,
      difficulty: fsrsData.difficulty,
      elapsed_days: fsrsData.elapsed_days,
      scheduled_days: fsrsData.scheduled_days,
      reps: fsrsData.reps,
      lapses: fsrsData.lapses,
      state: fsrsData.state as State,
      last_review: fsrsData.last_review ? new Date(fsrsData.last_review) : undefined,
      learning_steps: 0, // Default value for learning steps
    };
  }

  /**
   * Convert ts-fsrs Card back to our FSRSData format
   */
  private fromFSRSCard(fsrsCard: FSRSCard): FSRSData {
    return {
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      elapsed_days: fsrsCard.elapsed_days,
      scheduled_days: fsrsCard.scheduled_days,
      reps: fsrsCard.reps,
      lapses: fsrsCard.lapses,
      state: fsrsCard.state,
      last_review: fsrsCard.last_review,
    };
  }

  /**
   * Convert our Rating enum to FSRS Rating
   */
  private toFSRSRating(rating: Rating): FSRSRating {
    return rating as FSRSRating;
  }

  /**
   * Get the key name for accessing scheduling results
   */
  private getRatingKey(rating: FSRSRating): 'again' | 'hard' | 'good' | 'easy' {
    switch (rating) {
      case FSRSRating.Again:
        return 'again';
      case FSRSRating.Hard:
        return 'hard';
      case FSRSRating.Good:
        return 'good';
      case FSRSRating.Easy:
        return 'easy';
      default:
        return 'good';
    }
  }

  /**
   * Process a card review and return updated scheduling data
   */
  async reviewCard(
    card: Card,
    direction: ReviewDirection,
    rating: Rating
  ): Promise<Card> {
    // Fetch the latest version of the card to avoid conflicts
    const latestCard = await cardDb.getCard(card._id);
    if (!latestCard) {
      throw new Error('Card not found');
    }

    const fsrsData = latestCard.fsrsData[direction];
    const fsrsCard = this.toFSRSCard(fsrsData);
    const now = new Date();

    // Schedule the card based on rating
    const fsrsRating = this.toFSRSRating(rating);
    const schedulingInfo = this.fsrs.repeat(fsrsCard, now) as unknown as FSRSSchedulingResult;

    // Get the updated card for this rating
    const ratingKey = this.getRatingKey(fsrsRating);
    const updatedFSRSCard = schedulingInfo[ratingKey].card;

    // Update the card's FSRS data for this direction
    const updatedCard = { ...latestCard };
    updatedCard.fsrsData = { ...latestCard.fsrsData };
    updatedCard.fsrsData[direction] = this.fromFSRSCard(updatedFSRSCard);

    // Save to database
    return await cardDb.updateCard(updatedCard);
  }

  /**
   * Get the next review intervals for each rating (for preview)
   * Returns intervals in days
   */
  getReviewIntervals(card: Card, direction: ReviewDirection): {
    again: number;
    hard: number;
    good: number;
    easy: number;
  } {
    const fsrsData = card.fsrsData[direction];
    const fsrsCard = this.toFSRSCard(fsrsData);
    const now = new Date();

    const schedulingInfo = this.fsrs.repeat(fsrsCard, now) as unknown as FSRSSchedulingResult;

    return {
      again: schedulingInfo.again.card.scheduled_days,
      hard: schedulingInfo.hard.card.scheduled_days,
      good: schedulingInfo.good.card.scheduled_days,
      easy: schedulingInfo.easy.card.scheduled_days,
    };
  }

  /**
   * Get next review date for a card direction
   */
  getNextReviewDate(fsrsData: FSRSData): Date | null {
    if (!fsrsData.last_review) {
      return new Date(); // New cards are due now
    }

    const lastReview = new Date(fsrsData.last_review);
    const nextReview = new Date(
      lastReview.getTime() + fsrsData.scheduled_days * 24 * 60 * 60 * 1000
    );

    return nextReview;
  }

  /**
   * Check if a card direction is due for review
   */
  isCardDue(fsrsData: FSRSData): boolean {
    const nextReview = this.getNextReviewDate(fsrsData);
    if (!nextReview) return true;

    return new Date() >= nextReview;
  }

  /**
   * Format interval in human-readable form
   */
  formatInterval(days: number): string {
    if (days < 1) {
      const minutes = Math.round(days * 24 * 60);
      return `${minutes}m`;
    } else if (days < 30) {
      return `${Math.round(days)}d`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months}mo`;
    } else {
      const years = (days / 365).toFixed(1);
      return `${years}y`;
    }
  }
}

// Export singleton instance
export const fsrsService = new FSRSService();
