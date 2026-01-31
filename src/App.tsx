/**
 * Main App Component
 *
 * Root component that sets up providers and routing
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

type Screen = 'list' | 'settings' | 'reader' | 'decks' | 'review';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
    setCurrentScreen('reader');
  };

  const handleBackToList = () => {
    setSelectedDocument(null);
    setCurrentScreen('list');
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  const handleCloseSettings = () => {
    setCurrentScreen('list');
  };

  const handleOpenDecks = () => {
    setCurrentScreen('decks');
  };

  const handleBackToDecks = () => {
    setSelectedDeckId(null);
    setCurrentScreen('decks');
  };

  const handleReviewDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentScreen('review');
  };

  return (
    <ThemeProvider>
      <SettingsProvider>
        {currentScreen === 'list' && (
          <DocumentListScreen
            onDocumentSelect={handleDocumentSelect}
            onOpenSettings={handleOpenSettings}
            onOpenDecks={handleOpenDecks}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen onClose={handleCloseSettings} />
        )}

        {currentScreen === 'reader' && selectedDocument && (
          <MarkdownReader
            document={selectedDocument}
            onBack={handleBackToList}
          />
        )}

        {currentScreen === 'decks' && (
          <DecksScreen
            onBack={handleBackToList}
            onReviewDeck={handleReviewDeck}
          />
        )}

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
