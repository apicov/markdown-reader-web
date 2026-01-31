/**
 * Review Screen
 *
 * Flashcard review interface with FSRS scheduling.
 * Shows cards one at a time with flip animation and rating buttons.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Card,
  CardContent,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import type { Card as FlashCard, ReviewDirection, Deck } from '../types';
import { Rating } from '../types';
import { cardDb } from '../services/cardDatabaseService';
import { fsrsService } from '../services/fsrsService';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

interface ReviewScreenProps {
  deckId: string;
  onBack: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  deckId,
  onBack,
}) => {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [queue, setQueue] = useState<Array<{ card: FlashCard; direction: ReviewDirection }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    loadReviewSession();
  }, [deckId]);

  const loadReviewSession = async () => {
    setIsLoading(true);
    try {
      const deckData = await cardDb.getDeck(deckId);
      setDeck(deckData);

      const dueCards = await cardDb.getDueCards(deckId);
      setQueue(dueCards);
      setCurrentIndex(0);
      setShowAnswer(false);
    } catch (error) {
      console.error('Failed to load review session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleRating = async (rating: Rating) => {
    if (currentIndex >= queue.length) return;

    setIsReviewing(true);
    try {
      const { card, direction } = queue[currentIndex];

      // Update card with FSRS
      await fsrsService.reviewCard(card, direction, rating);

      // Move to next card
      if (currentIndex + 1 < queue.length) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Review session complete
        onBack();
      }
    } catch (error) {
      console.error('Failed to review card:', error);
      alert('Failed to save review. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queue.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton color="inherit" onClick={onBack} edge="start" sx={{ mr: 2 }}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" component="div">
              {deck?.name || 'Review'}
            </Typography>
          </Toolbar>
        </AppBar>

        <EmptyState
          title="All done! 🎉"
          description="No cards due for review right now."
          action={{
            label: "Back to Decks",
            onClick: onBack,
          }}
        />
      </Box>
    );
  }

  const current = queue[currentIndex];
  const progress = ((currentIndex + 1) / queue.length) * 100;
  const front = current.direction === 'forward' ? current.card.front : current.card.back;
  const back = current.direction === 'forward' ? current.card.back : current.card.front;
  const directionIndicator = current.direction === 'forward' ? '→' : '←';

  // Get interval previews
  const intervals = showAnswer
    ? fsrsService.getReviewIntervals(current.card, current.direction)
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={onBack} edge="start" sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {deck?.name || 'Review'}
          </Typography>
          <Typography variant="body2">
            {currentIndex + 1} / {queue.length}
          </Typography>
        </Toolbar>
        <LinearProgress variant="determinate" value={progress} />
      </AppBar>

      {/* Card Display */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          gap: 3,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {directionIndicator} {current.direction === 'forward' ? 'Front → Back' : 'Back → Front'}
        </Typography>

        <Card
          sx={{
            width: '100%',
            maxWidth: 600,
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
            cursor: showAnswer ? 'default' : 'pointer',
          }}
          onClick={!showAnswer ? handleShowAnswer : undefined}
        >
          <CardContent sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="h4" gutterBottom>
              {front}
            </Typography>

            {showAnswer && (
              <>
                <Box sx={{ my: 3, borderTop: 1, borderColor: 'divider' }} />
                <Typography variant="h5" color="text.secondary">
                  {back}
                </Typography>
              </>
            )}

            {!showAnswer && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Tap to reveal answer
              </Typography>
            )}
          </CardContent>
        </Card>

        {!showAnswer ? (
          <Button
            variant="contained"
            size="large"
            onClick={handleShowAnswer}
            sx={{ minWidth: 200 }}
          >
            Show Answer
          </Button>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              width: '100%',
              maxWidth: 600,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => handleRating(Rating.Again)}
                disabled={isReviewing}
              >
                Again
                {intervals && (
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {fsrsService.formatInterval(intervals.again)}
                  </Typography>
                )}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                onClick={() => handleRating(Rating.Hard)}
                disabled={isReviewing}
              >
                Hard
                {intervals && (
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {fsrsService.formatInterval(intervals.hard)}
                  </Typography>
                )}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={() => handleRating(Rating.Good)}
                disabled={isReviewing}
              >
                Good
                {intervals && (
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {fsrsService.formatInterval(intervals.good)}
                  </Typography>
                )}
              </Button>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => handleRating(Rating.Easy)}
                disabled={isReviewing}
              >
                Easy
                {intervals && (
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {fsrsService.formatInterval(intervals.easy)}
                  </Typography>
                )}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
