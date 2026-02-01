/**
 * Main App Component
 *
 * This is the root component of the application that manages:
 * - Global state providers (Theme, Settings)
 * - Screen navigation (manual routing)
 * - Document and deck selection state
 *
 * LEARNING NOTES - React Concepts:
 * - Component composition: Wrapping components with providers
 * - State management: Using useState for navigation and selections
 * - Conditional rendering: Showing different screens based on state
 * - Props drilling: Passing callbacks down to child components
 *
 * LEARNING NOTES - TypeScript:
 * - Type aliases (type Screen = ...)
 * - Union types ('list' | 'settings' | ...)
 * - Nullable types (Document | null)
 * - Import types separately (import type { Document })
 */

import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { DocumentListScreen } from './components/DocumentListScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { MarkdownReader } from './components/MarkdownReader';
import { DecksScreen } from './components/DecksScreen';
import { ReviewScreen } from './components/ReviewScreen';
import type { Document } from './types';

/**
 * Screen type defines all possible screens in the app
 * This is a union type - the variable can only be one of these exact strings
 * TypeScript will prevent typos and invalid values
 */
type Screen = 'list' | 'settings' | 'reader' | 'decks' | 'review';

function App() {
  /**
   * Navigation State
   *
   * Instead of using react-router, this app uses simple state-based navigation.
   * Good for learning React fundamentals before adding routing libraries.
   *
   * PATTERN: Manual routing with conditional rendering
   * - Store current screen as state
   * - Render different components based on state value
   * - Child components call handlers to change screens
   */
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');

  /**
   * Selected Document State
   *
   * LEARNING NOTE - State lifting:
   * This state is shared between DocumentListScreen (for selection)
   * and MarkdownReader (for display), so it lives in the parent (App)
   *
   * Type: Document | null
   * - null when no document is selected
   * - Document object when one is selected
   */
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  /**
   * Selected Deck State
   *
   * Similar pattern to selectedDocument - stores which flashcard deck
   * the user wants to review
   */
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  /**
   * Event Handlers
   *
   * LEARNING NOTE - Callback props pattern:
   * These functions are passed to child components as props.
   * When a child needs to trigger navigation or state changes,
   * it calls these callbacks instead of directly modifying parent state.
   *
   * WHY: This maintains "one-way data flow" (React principle)
   * - Data flows down via props
   * - Changes flow up via callbacks
   */

  /**
   * Handler: Document selection
   * Called when user clicks a document in the list
   *
   * PATTERN: Multiple state updates in one handler
   * - Save which document was selected
   * - Navigate to the reader screen
   */
  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
    setCurrentScreen('reader');
  };

  /**
   * Handler: Return to document list
   * Clears selection and navigates back
   */
  const handleBackToList = () => {
    setSelectedDocument(null);
    setCurrentScreen('list');
  };

  /**
   * Handler: Open settings screen
   */
  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  /**
   * Handler: Close settings screen
   */
  const handleCloseSettings = () => {
    setCurrentScreen('list');
  };

  /**
   * Handler: Open flashcard decks screen
   */
  const handleOpenDecks = () => {
    setCurrentScreen('decks');
  };

  /**
   * Deck Refresh Key
   *
   * LEARNING NOTE - Force re-render pattern:
   * React components re-render when their props change.
   * By using a number as a `key` prop and incrementing it,
   * we can force React to completely unmount and remount the component.
   *
   * USE CASE: Refresh deck list after reviewing cards
   */
  const [decksRefreshKey, setDecksRefreshKey] = useState(0);

  /**
   * Handler: Return to decks list
   * Also triggers a refresh by incrementing the key
   *
   * LEARNING NOTE - prev => prev + 1:
   * This is the "updater function" form of setState.
   * Use this when new state depends on old state to avoid stale closures.
   */
  const handleBackToDecks = () => {
    setSelectedDeckId(null);
    setCurrentScreen('decks');
    setDecksRefreshKey(prev => prev + 1); // Increment key to force component refresh
  };

  /**
   * Handler: Start reviewing a specific deck
   */
  const handleReviewDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentScreen('review');
  };

  /**
   * Render the component tree
   *
   * LEARNING NOTES - Provider pattern:
   * ThemeProvider and SettingsProvider wrap the entire app to provide
   * global state via React Context. Any component in the tree can access
   * theme/settings without prop drilling.
   *
   * LEARNING NOTES - Conditional rendering:
   * Only ONE screen renders at a time based on currentScreen state.
   * Uses logical AND (&&) operator:
   * - {condition && <Component />} renders Component if condition is true
   * - If condition is false, nothing renders
   *
   * LEARNING NOTES - Component composition:
   * Each screen is a separate component that receives:
   * - Data via props (document, deckId)
   * - Callbacks via props (onBack, onDocumentSelect, etc.)
   */
  return (
    <ThemeProvider>
      <SettingsProvider>
        {/* Document List Screen - Default/home screen */}
        {currentScreen === 'list' && (
          <DocumentListScreen
            onDocumentSelect={handleDocumentSelect}
            onOpenSettings={handleOpenSettings}
            onOpenDecks={handleOpenDecks}
          />
        )}

        {/* Settings Screen */}
        {currentScreen === 'settings' && (
          <SettingsScreen onClose={handleCloseSettings} />
        )}

        {/* Markdown Reader Screen - Shows selected document */}
        {/* Note: Double condition checks both screen AND that document exists */}
        {currentScreen === 'reader' && selectedDocument && (
          <MarkdownReader
            document={selectedDocument}
            onBack={handleBackToList}
          />
        )}

        {/* Flashcard Decks List Screen */}
        {/* Note: key={decksRefreshKey} forces re-render when key changes */}
        {currentScreen === 'decks' && (
          <DecksScreen
            key={decksRefreshKey}
            onBack={handleBackToList}
            onReviewDeck={handleReviewDeck}
          />
        )}

        {/* Flashcard Review Screen - Shows cards from selected deck */}
        {currentScreen === 'review' && selectedDeckId && (
          <ReviewScreen
            deckId={selectedDeckId}
            onBack={handleBackToDecks}
          />
        )}
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
