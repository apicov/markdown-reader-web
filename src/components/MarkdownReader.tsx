/**
 * Markdown Reader Component
 *
 * Main component for reading markdown documents with features like:
 * - Markdown rendering with syntax highlighting
 * - LaTeX math support
 * - Table of contents navigation
 * - Font size adjustment
 * - Reading position persistence
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Slider,
  CircularProgress,
} from '@mui/material';
import { LoadingSpinner } from './LoadingSpinner';
import {
  ArrowBack as BackIcon,
  Menu as MenuIcon,
  TextIncrease as FontSizeIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../hooks/useTranslation';
import type { Document, Deck } from '../types';
import { readMarkdownFile, getWebImage } from '../services/documentService';
import { extractTableOfContents, type TocItem } from '../services/tocService';
import {
  saveReadingPosition,
  getReadingPosition,
} from '../services/readingPositionService';
import { getCachedDocumentData, cacheDocumentData } from '../services/cacheService';
import { cardDb } from '../services/cardDatabaseService';
import { AUTO_SAVE_INTERVAL_MS, MIN_FONT_SIZE, MAX_FONT_SIZE, MAX_IMAGE_CACHE_SIZE } from '../constants';
import { Capacitor } from '@capacitor/core';

interface MarkdownReaderProps {
  document: Document;
  onBack: () => void;
}

export const MarkdownReader: React.FC<MarkdownReaderProps> = ({
  document,
  onBack,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { translate, clearTranslation, state: translationState } = useTranslation();

  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [fontSizeDialogOpen, setFontSizeDialogOpen] = useState(false);
  const [fontSize, setFontSize] = useState(settings.fontSize);

  // Card save dialog state
  const [saveCardDialogOpen, setSaveCardDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [reviewBothDirections, setReviewBothDirections] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isSavingCard, setIsSavingCard] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const imageCacheRef = useRef<Map<string, string>>(new Map());
  const selectionTimerRef = useRef<number | null>(null);

  // Load document on mount
  useEffect(() => {
    loadDocument();

    // Save position on unmount
    return () => {
      saveCurrentPosition();
    };
  }, [document.id]);

  // Extract sentence containing the selected text
  const extractSentenceContext = useCallback((selectedText: string): string | null => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;

    // Get the text node containing the selection
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Walk up the DOM tree to find a paragraph or larger block element
    // This ensures we capture the full sentence, even if parts are in different spans/elements
    let parentElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as HTMLElement;

    // Keep walking up until we find a block-level element that likely contains a full sentence
    while (parentElement && parentElement !== contentRef.current) {
      const tagName = parentElement.tagName;
      // Stop at block-level elements that typically contain complete sentences
      if (['P', 'DIV', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'ARTICLE', 'SECTION', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
        break;
      }
      parentElement = parentElement.parentElement;
    }

    if (!parentElement) return null;

    const fullText = parentElement.textContent || '';

    // Find sentence boundaries (., !, ?, or newlines)
    const selectedIndex = fullText.indexOf(selectedText);
    if (selectedIndex === -1) return null;

    // Find start of sentence (look backwards for sentence ending or start of text)
    let sentenceStart = 0;
    for (let i = selectedIndex - 1; i >= 0; i--) {
      if (/[.!?\n]/.test(fullText[i])) {
        sentenceStart = i + 1;
        break;
      }
    }

    // Find end of sentence (look forwards for sentence ending or end of text)
    let sentenceEnd = fullText.length;
    for (let i = selectedIndex + selectedText.length; i < fullText.length; i++) {
      if (/[.!?\n]/.test(fullText[i])) {
        sentenceEnd = i + 1;
        break;
      }
    }

    const sentence = fullText.substring(sentenceStart, sentenceEnd).trim();
    console.log('[MarkdownReader] Full text from parent:', fullText.substring(0, 100));
    console.log('[MarkdownReader] Extracted sentence:', sentence);
    return sentence.length > selectedText.length ? sentence : null;
  }, []);

  // Listen for text selection changes (essential for mobile/Capacitor)
  useEffect(() => {
    const handleSelectionChange = () => {
      console.log('[MarkdownReader] selectionchange event fired');

      // Clear any existing timer
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }

      // Debounce selection changes to avoid triggering too often during selection
      selectionTimerRef.current = window.setTimeout(() => {
        const selection = window.getSelection();
        console.log('[MarkdownReader] Selection check:', selection?.toString().length);

        if (selection && selection.toString().trim().length > 0) {
          const selected = selection.toString().trim();
          console.log('[MarkdownReader] Selected text:', selected, 'Length:', selected.length);

          if (selected.length > 2) {
            console.log('[MarkdownReader] Triggering translation...');
            setSelectedText(selected);
            const sentenceContext = extractSentenceContext(selected);
            console.log('[MarkdownReader] Sentence context:', sentenceContext);
            translate(selected, sentenceContext);
          }
        }
      }, 500);
    };

    window.document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      window.document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }
    };
  }, [translate, extractSentenceContext]);

  // Load decks on mount
  useEffect(() => {
    loadDecks();
  }, []);

  // Auto-save position periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveCurrentPosition();
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [document.id]);

  const loadDocument = async () => {
    setIsLoading(true);
    try {
      const content = await readMarkdownFile(document.markdownFile);
      setMarkdown(content);

      // Try to get cached TOC
      const cachedData = await getCachedDocumentData(document.id, content);
      let toc: TocItem[];

      if (cachedData) {
        toc = cachedData.toc;
      } else {
        toc = extractTableOfContents(content);
        await cacheDocumentData(document.id, content, toc, []);
      }

      setTocItems(toc);

      // Restore scroll position
      setTimeout(async () => {
        const savedPosition = await getReadingPosition(document.id);
        if (savedPosition && contentRef.current) {
          contentRef.current.scrollTop = savedPosition.scrollOffset;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentPosition = () => {
    if (contentRef.current) {
      const scrollOffset = contentRef.current.scrollTop;
      saveReadingPosition(document.id, scrollOffset);
    }
  };

  const loadDecks = async () => {
    try {
      const allDecks = await cardDb.getAllDecks();
      setDecks(allDecks);

      // Try to find a deck matching the document name
      const matchingDeck = allDecks.find((d) => d.name === document.title);
      if (matchingDeck) {
        setSelectedDeckId(matchingDeck._id);
      } else {
        // Create a new deck for this document
        const newDeck = await cardDb.createDeck(document.title);
        setDecks([...allDecks, newDeck]);
        setSelectedDeckId(newDeck._id);
      }
    } catch (error) {
      console.error('Failed to load decks:', error);
    }
  };

  const handleTocItemClick = (headingId: string) => {
    setTocOpen(false);
    const element = window.document.getElementById(headingId);
    if (element && contentRef.current) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFontSizeChange = (_: Event, value: number | number[]) => {
    const newSize = Array.isArray(value) ? value[0] : value;
    setFontSize(newSize);
  };

  const handleFontSizeSave = () => {
    updateSettings({ fontSize });
    setFontSizeDialogOpen(false);
  };

  const handleTextSelection = useCallback(() => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      console.log('[MarkdownReader] Text selection event triggered');

      if (selection && selection.toString().trim().length > 0) {
        const selected = selection.toString().trim();
        console.log('[MarkdownReader] Selected text:', selected, 'Length:', selected.length);

        // Only translate if user selected more than a few characters
        if (selected.length > 2) {
          console.log('[MarkdownReader] Triggering translation...');
          setSelectedText(selected);
          const sentenceContext = extractSentenceContext(selected);
          console.log('[MarkdownReader] Sentence context:', sentenceContext);
          translate(selected, sentenceContext);
        } else {
          console.log('[MarkdownReader] Text too short, skipping translation');
        }
      } else {
        console.log('[MarkdownReader] No text selected');
      }
    }, 100);
  }, [translate, extractSentenceContext]);

  const handleQuickSaveCard = async () => {
    if (!selectedText.trim() || !translationState.translation?.trim() || !selectedDeckId) {
      return;
    }

    setIsSavingCard(true);
    try {
      // Use normalized form (infinitive/with article) as the front of the card
      const cardFrontText = translationState.normalizedForm || selectedText.trim();

      await cardDb.createCard(
        selectedDeckId,
        cardFrontText,
        translationState.translation.trim(),
        reviewBothDirections,
        document.id
      );

      // Close translation dialog
      clearTranslation();
    } catch (error) {
      console.error('Failed to save card:', error);
      alert('Failed to save card. Please try again.');
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleSaveAsCard = () => {
    // Pre-fill the form with normalized form and translation
    const frontText = translationState.normalizedForm || selectedText;
    setCardFront(frontText);
    setCardBack(translationState.translation || '');
    setSaveCardDialogOpen(true);
  };

  const handleSaveCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !selectedDeckId) {
      return;
    }

    setIsSavingCard(true);
    try {
      await cardDb.createCard(
        selectedDeckId,
        cardFront.trim(),
        cardBack.trim(),
        reviewBothDirections,
        document.id
      );

      // Close dialogs and reset state
      setSaveCardDialogOpen(false);
      clearTranslation();
      setCardFront('');
      setCardBack('');
    } catch (error) {
      console.error('Failed to save card:', error);
      alert('Failed to save card. Please try again.');
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleCancelSaveCard = () => {
    setSaveCardDialogOpen(false);
    setCardFront('');
    setCardBack('');
  };

  // Custom image component to handle web file cache
  // Memoized to prevent recreation on every render (only recreates when document changes)
  const ImageComponent = useMemo(() => {
    const CachedImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, alt, ...props }) => {
      const [imageSrc, setImageSrc] = useState<string | undefined>(src);

      useEffect(() => {
        const loadImage = async () => {
          if (!src) return;

          // Check if we're on web platform and have a relative path
          if (Capacitor.getPlatform() === 'web' && !src.startsWith('http') && !src.startsWith('data:')) {
            // Check cache first
            const cached = imageCacheRef.current.get(src);
            if (cached) {
              setImageSrc(cached);
              return;
            }

            // Load from file cache
            const dataUrl = await getWebImage(document.folderPath, src);
            if (dataUrl) {
              setImageSrc(dataUrl);
              // Update cache using ref (not state) to avoid triggering re-renders
              // Implement LRU cache: remove oldest entry if cache is full
              if (imageCacheRef.current.size >= MAX_IMAGE_CACHE_SIZE) {
                const firstKey = imageCacheRef.current.keys().next().value;
                if (firstKey) {
                  imageCacheRef.current.delete(firstKey);
                }
              }
              imageCacheRef.current.set(src, dataUrl);
            } else {
              console.warn('Image not found in cache:', src);
            }
          } else {
            setImageSrc(src);
          }
        };

        loadImage();
      }, [src]);

      return <img src={imageSrc} alt={alt} {...props} />;
    };

    return CachedImage;
  }, [document.folderPath]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={onBack} edge="start" sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} noWrap>
            {document.title}
          </Typography>

          <IconButton
            color="inherit"
            onClick={() => setTocOpen(true)}
            disabled={tocItems.length === 0}
          >
            <MenuIcon />
          </IconButton>

          <IconButton color="inherit" onClick={() => setFontSizeDialogOpen(true)}>
            <FontSizeIcon />
          </IconButton>

          <IconButton color="inherit" onClick={toggleTheme}>
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box
        ref={contentRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          px: 3,
          py: 2,
        }}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <MarkdownContent
            markdown={markdown}
            fontSize={fontSize}
            onMouseUp={handleTextSelection}
            ImageComponent={ImageComponent}
          />
        )}
      </Box>

      {/* Table of Contents Drawer */}
      <Drawer anchor="left" open={tocOpen} onClose={() => setTocOpen(false)}>
        <Box sx={{ width: 300, pt: 2 }}>
          <Typography variant="h6" sx={{ px: 2, pb: 1 }}>
            Table of Contents
          </Typography>
          <List>
            {tocItems.map((item) => (
              <ListItem
                key={item.id}
                disablePadding
                sx={{ pl: item.level * 2 }}
              >
                <ListItemButton onClick={() => handleTocItemClick(item.id)}>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: 16 - item.level,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Font Size Dialog */}
      <Dialog
        open={fontSizeDialogOpen}
        onClose={() => setFontSizeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Adjust Font Size</DialogTitle>
        <DialogContent>
          <Box sx={{ px: 2, pt: 2 }}>
            <Typography gutterBottom>Font Size: {fontSize}px</Typography>
            <Slider
              value={fontSize}
              onChange={handleFontSizeChange}
              onChangeCommitted={handleFontSizeSave}
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Translation Bottom Sheet */}
      <TranslationBottomSheet
        isOpen={translationState.translation !== null || translationState.isTranslating || translationState.error !== null}
        isTranslating={translationState.isTranslating}
        translation={translationState.translation}
        normalizedForm={translationState.normalizedForm}
        error={translationState.error}
        onClose={clearTranslation}
        onQuickSave={handleQuickSaveCard}
        onSaveAsCard={handleSaveAsCard}
        isSaving={isSavingCard}
      />

      {/* Save Card Dialog */}
      <Dialog
        open={saveCardDialogOpen}
        onClose={handleCancelSaveCard}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save as Flashcard</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Front (word/phrase)"
              fullWidth
              multiline
              rows={2}
              value={cardFront}
              onChange={(e) => setCardFront(e.target.value)}
              disabled={isSavingCard}
            />
            <TextField
              label="Back (translation/definition)"
              fullWidth
              multiline
              rows={3}
              value={cardBack}
              onChange={(e) => setCardBack(e.target.value)}
              disabled={isSavingCard}
            />
            <TextField
              select
              label="Deck"
              fullWidth
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              disabled={isSavingCard}
            >
              {decks.map((deck) => (
                <MenuItem key={deck._id} value={deck._id}>
                  {deck.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={reviewBothDirections}
                  onChange={(e) => setReviewBothDirections(e.target.checked)}
                  disabled={isSavingCard}
                />
              }
              label="Review in both directions"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSaveCard} disabled={isSavingCard}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveCard}
            variant="contained"
            disabled={isSavingCard || !cardFront.trim() || !cardBack.trim()}
          >
            {isSavingCard ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Memoized markdown content to prevent expensive re-renders when translation dialog opens/closes
const MarkdownContent = memo(({
  markdown,
  fontSize,
  onMouseUp,
  ImageComponent,
}: {
  markdown: string;
  fontSize: number;
  onMouseUp: () => void;
  ImageComponent: React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>;
}) => (
  <Box
    onMouseUp={onMouseUp}
    sx={{
      fontSize: `${fontSize}px`,
      lineHeight: 1.6,
      '& h1': { fontSize: `${fontSize * 1.8}px` },
      '& h2': { fontSize: `${fontSize * 1.5}px` },
      '& h3': { fontSize: `${fontSize * 1.3}px` },
      '& code': { fontSize: `${fontSize * 0.9}px` },
      '& img': { maxWidth: '100%', height: 'auto' },
      userSelect: 'text',
      cursor: 'text',
    }}
  >
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={{
        img: ImageComponent,
      }}
    >
      {markdown}
    </ReactMarkdown>
  </Box>
));
MarkdownContent.displayName = 'MarkdownContent';

// Memoized translation bottom sheet to prevent re-renders
const TranslationBottomSheet = memo(({
  isOpen,
  isTranslating,
  translation,
  normalizedForm,
  error,
  onClose,
  onQuickSave,
  onSaveAsCard,
  isSaving,
}: {
  isOpen: boolean;
  isTranslating: boolean;
  translation: string | null;
  normalizedForm: string | null;
  error: string | null;
  onClose: () => void;
  onQuickSave: () => void;
  onSaveAsCard: () => void;
  isSaving: boolean;
}) => (
  <Dialog
    open={isOpen}
    onClose={onClose}
    fullWidth
    keepMounted
    TransitionProps={{
      unmountOnExit: false,
      timeout: 200,
    }}
    PaperProps={{
      sx: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        m: 0,
        width: '100%',
        maxWidth: '100%',
        maxHeight: '40vh',
        borderRadius: '16px 16px 0 0',
      },
    }}
    sx={{
      '& .MuiBackdrop-root': {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
    }}
  >
    <Box sx={{
      px: 2,
      py: 2,
      pb: 'calc(16px + env(safe-area-inset-bottom))',
      overflow: 'auto',
      maxHeight: '40vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      {isTranslating ? (
        <Box sx={{ py: 2, textAlign: 'center', flex: 1 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ mt: 1 }}>Translating...</Typography>
        </Box>
      ) : error ? (
        <Typography variant="body1" color="error" sx={{ flex: 1 }}>{error}</Typography>
      ) : (
        <>
          {normalizedForm && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Base form:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {normalizedForm}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, flex: 1 }}>
              {translation}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button
                size="medium"
                onClick={onSaveAsCard}
                variant="outlined"
                disabled={isSaving}
              >
                Save...
              </Button>
              <Button
                size="medium"
                onClick={onQuickSave}
                variant="contained"
                disabled={isSaving}
              >
                {isSaving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Box>
  </Dialog>
));
TranslationBottomSheet.displayName = 'TranslationBottomSheet';
