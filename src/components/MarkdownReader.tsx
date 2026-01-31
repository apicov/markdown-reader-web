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
  CircularProgress,
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
} from '@mui/material';
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
import { AUTO_SAVE_INTERVAL_MS, MIN_FONT_SIZE, MAX_FONT_SIZE } from '../constants';
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

  // Load document on mount
  useEffect(() => {
    loadDocument();

    // Save position on unmount
    return () => {
      saveCurrentPosition();
    };
  }, [document.id]);

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

      // Auto-select or create deck based on document name
      if (allDecks.length === 0) {
        const newDeck = await cardDb.createDeck(document.title);
        setDecks([newDeck]);
        setSelectedDeckId(newDeck._id);
      } else {
        // Try to find a deck matching the document name
        const matchingDeck = allDecks.find((d) => d.name === document.title);
        if (matchingDeck) {
          setSelectedDeckId(matchingDeck._id);
        } else {
          // Use the first deck as default
          setSelectedDeckId(allDecks[0]._id);
        }
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
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selected = selection.toString().trim();
      // Only translate if user selected more than a few characters
      if (selected.length > 2) {
        setSelectedText(selected);
        translate(selected);
      }
    }
  }, [translate]);

  const handleSaveAsCard = () => {
    // Pre-fill the form with selected text and translation
    setCardFront(selectedText);
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
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

      {/* Translation Modal */}
      <TranslationDialog
        isOpen={translationState.translation !== null || translationState.isTranslating}
        isTranslating={translationState.isTranslating}
        translation={translationState.translation}
        error={translationState.error}
        onClose={clearTranslation}
        onSaveAsCard={handleSaveAsCard}
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

// Memoized translation dialog to prevent re-renders
const TranslationDialog = memo(({
  isOpen,
  isTranslating,
  translation,
  error,
  onClose,
  onSaveAsCard,
}: {
  isOpen: boolean;
  isTranslating: boolean;
  translation: string | null;
  error: string | null;
  onClose: () => void;
  onSaveAsCard: () => void;
}) => (
  <Dialog
    open={isOpen}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    keepMounted
    TransitionProps={{
      unmountOnExit: false,
      timeout: 150,
    }}
    slotProps={{
      backdrop: {
        timeout: 150,
      },
    }}
  >
    <DialogTitle>
      Translation
      {isTranslating && (
        <CircularProgress size={20} sx={{ ml: 2 }} />
      )}
    </DialogTitle>
    <DialogContent>
      {isTranslating ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Translating...</Typography>
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Typography sx={{ py: 2, whiteSpace: 'pre-wrap' }}>
          {translation}
        </Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
      {translation && !error && (
        <Button onClick={onSaveAsCard} variant="contained">
          Save as Card
        </Button>
      )}
    </DialogActions>
  </Dialog>
));
TranslationDialog.displayName = 'TranslationDialog';
