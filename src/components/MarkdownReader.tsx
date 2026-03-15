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

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
import DocumentProvider from '../plugins/documentProvider';
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
  const fileUriMapRef = useRef<Map<string, string>>(new Map()); // Maps filename -> content URI

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
    // But limit to just a few steps to avoid grabbing too much text
    let steps = 0;
    const maxSteps = 3;
    while (parentElement && parentElement !== contentRef.current && steps < maxSteps) {
      const tagName = parentElement.tagName;
      // Stop at block-level elements that typically contain complete sentences
      if (['P', 'LI', 'BLOCKQUOTE', 'TD', 'TH'].includes(tagName)) {
        break;
      }
      parentElement = parentElement.parentElement;
      steps++;
    }

    if (!parentElement) return null;

    const fullText = parentElement.textContent || '';

    // Don't extract context if the full text is too long (likely multiple sentences/paragraphs)
    if (fullText.length > 300) {
      console.log('[MarkdownReader] Parent text too long, skipping context extraction');
      return null;
    }

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

    // Don't use context if the extracted sentence is too long (likely grabbed too much)
    if (sentence.length > 200) {
      console.log('[MarkdownReader] Extracted sentence too long, skipping context');
      return null;
    }

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

            // Only extract sentence context for short selections (single words/phrases)
            // For longer selections (full sentences), don't expand context
            const sentenceContext = selected.length < 50 ? extractSentenceContext(selected) : null;
            console.log('[MarkdownReader] Sentence context:', sentenceContext);
            translate(selected, sentenceContext);

            // Clear selection to prevent multiple translations
            selection.removeAllRanges();
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

      // Pre-load file URI map for Android content URIs (for image loading performance)
      if (Capacitor.getPlatform() !== 'web' && document.folderPath.startsWith('content://')) {
        try {
          console.log('[loadDocument] Pre-loading file URI map...');
          const dirResult = await DocumentProvider.listDirectory({ uri: document.folderPath });
          fileUriMapRef.current.clear();
          dirResult.files.forEach((file: any) => {
            fileUriMapRef.current.set(file.name, file.uri);
          });
          console.log('[loadDocument] File URI map loaded with', fileUriMapRef.current.size, 'entries');
        } catch (error) {
          console.error('[loadDocument] Failed to pre-load file URI map:', error);
        }
      }

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

          // Only extract sentence context for short selections (single words/phrases)
          // For longer selections (full sentences), don't expand context
          const sentenceContext = selected.length < 50 ? extractSentenceContext(selected) : null;
          console.log('[MarkdownReader] Sentence context:', sentenceContext);
          translate(selected, sentenceContext);

          // Clear selection to prevent multiple translations
          selection.removeAllRanges();
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
      const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

      useEffect(() => {
        const loadImage = async () => {
          if (!src) return;

          // Check if it's a relative path (not HTTP, data URL, or content URI)
          const isRelativePath = !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('content://') && !src.startsWith('capacitor://');

          if (isRelativePath) {
            // Check cache first
            const cached = imageCacheRef.current.get(src);
            if (cached) {
              setImageSrc(cached);
              return;
            }

            if (Capacitor.getPlatform() === 'web') {
              // Web: Load from file cache as data URL
              const dataUrl = await getWebImage(document.folderPath, src);
              if (dataUrl) {
                setImageSrc(dataUrl);
                if (imageCacheRef.current.size >= MAX_IMAGE_CACHE_SIZE) {
                  const firstKey = imageCacheRef.current.keys().next().value;
                  if (firstKey) imageCacheRef.current.delete(firstKey);
                }
                imageCacheRef.current.set(src, dataUrl);
              }
            } else if (document.folderPath.startsWith('content://')) {
              // Android with content URI: Use pre-loaded file URI map
              try {
                const imageUri = fileUriMapRef.current.get(src);

                if (imageUri) {
                  // Read the image file as base64
                  const fileResult = await DocumentProvider.readFile({ uri: imageUri, asBase64: true });
                  // Convert to data URL
                  const dataUrl = `data:image/jpeg;base64,${fileResult.content}`;
                  setImageSrc(dataUrl);
                  imageCacheRef.current.set(src, dataUrl);
                } else {
                  console.warn('[CachedImage] Image URI not found in map:', src);
                }
              } catch (error) {
                console.error('[CachedImage] Error loading image:', error);
              }
            } else {
              // Mobile with regular file path: Construct full path and convert for WebView
              const fullPath = `${document.folderPath}/${src}`;
              const convertedSrc = Capacitor.convertFileSrc(fullPath);
              setImageSrc(convertedSrc);
              imageCacheRef.current.set(src, convertedSrc);
            }
          } else {
            // Already a full URL
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
      <AppBar position="fixed">
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
          mt: '64px', // Add top margin to account for fixed AppBar height
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
}) => {
  // Track heading index for IDs
  let headingIndex = 0;

  // Custom heading component that adds IDs
  const HeadingComponent = (level: number) => {
    return ({ children, ...props }: any) => {
      let extractedId: string | null = null;

      // Function to extract ID from text content like '<span id="my-id"></span>'
      const extractIdFromText = (text: string): string | null => {
        const match = text.match(/<span\s+id="([^"]+)"><\/span>/);
        return match ? match[1] : null;
      };

      // Recursive function to search for ID
      const findId = (node: any): string | null => {
        if (!node) return null;

        // If it's a string, check for <span id="..."></span> pattern
        if (typeof node === 'string') {
          const id = extractIdFromText(node);
          if (id) return id;
        }

        // Check if this node is a span with id (when rehypeRaw is used)
        if (node.type === 'span' && node.props?.id) {
          return node.props.id;
        }

        // Check children
        if (node.props?.children) {
          const childArray = Array.isArray(node.props.children)
            ? node.props.children
            : [node.props.children];

          for (const child of childArray) {
            const foundId = findId(child);
            if (foundId) return foundId;
          }
        }

        return null;
      };

      // Search in children
      const childArray = Array.isArray(children) ? children : [children];
      for (const child of childArray) {
        const foundId = findId(child);
        if (foundId) {
          extractedId = foundId;
          break;
        }
      }

      // Use extracted ID if found, otherwise generate sequential ID
      const id = extractedId || `heading-${headingIndex++}`;

      // Debug log
      if (level === 2 && extractedId) {
        console.log(`[HeadingComponent] h2 ID: ${extractedId}`);
      }

      return React.createElement(`h${level}`, { id, ...props }, children);
    };
  };

  return (
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
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          img: ImageComponent,
          h1: HeadingComponent(1),
          h2: HeadingComponent(2),
          h3: HeadingComponent(3),
          h4: HeadingComponent(4),
          h5: HeadingComponent(5),
          h6: HeadingComponent(6),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </Box>
  );
});
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
