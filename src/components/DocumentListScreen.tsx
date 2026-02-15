/**
 * Document List Screen
 *
 * Displays list of available markdown documents and allows user to select one to read.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Container,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Refresh as RefreshIcon,
  Folder as FolderIcon,
  Style as CardsIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import type { Document } from '../types';
import {
  getDocuments,
  findMarkdownInFolder,
  requestDirectoryAccess,
  hasWebDirectoryAccess,
  loadSingleFile,
} from '../services/documentService';
import { MESSAGES } from '../constants/messages';

interface DocumentListScreenProps {
  onDocumentSelect: (doc: Document) => void;
  onOpenSettings: () => void;
  onOpenDecks: () => void;
}

export const DocumentListScreen: React.FC<DocumentListScreenProps> = ({
  onDocumentSelect,
  onOpenSettings,
  onOpenDecks,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const platform = Capacitor.getPlatform();

      // On mobile, restore directory access with the saved URI
      if (platform !== 'web' && settings.docsPath) {
        await requestDirectoryAccess(settings.docsPath);
      }

      const docs = await getDocuments(settings.docsPath);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settings.docsPath]);

  // Load documents on mount and when docsPath changes
  useEffect(() => {
    if (settings.docsPath) {
      loadDocuments();
    }
  }, [settings.docsPath, loadDocuments]);

  const handleDocumentClick = async (doc: Document) => {
    // Find markdown file in folder
    const markdownFile = await findMarkdownInFolder(doc.folderPath);
    if (markdownFile) {
      onDocumentSelect({
        ...doc,
        markdownFile,
      });
    } else {
      alert(MESSAGES.ERRORS.NO_MARKDOWN_IN_FOLDER);
    }
  };

  const handlePickFolderWeb = async () => {
    // Web: Use File System Access API
    if (!('showDirectoryPicker' in window)) {
      alert(MESSAGES.ERRORS.BROWSER_NOT_SUPPORTED);
      return;
    }

    const handle = await requestDirectoryAccess();

    if (handle) {
      // Load documents from the selected folder
      const docs = await getDocuments('');
      setDocuments(docs);

      if (docs.length === 0) {
        alert(MESSAGES.ERRORS.NO_DOCUMENTS_FOUND);
      }
    } else {
      alert(MESSAGES.ERRORS.FOLDER_SELECTION_FAILED);
    }
  };

  const handlePickFolderMobile = async () => {
    // Mobile: Use Capacitor FilePicker plugin
    const result = await FilePicker.pickDirectory();

    // The FilePicker should return a URI on Android, not a path
    const dirUri: string | undefined = ('uri' in result && typeof result.uri === 'string')
      ? result.uri
      : ('path' in result && typeof result.path === 'string')
        ? result.path
        : undefined;

    if (result && dirUri) {
      // Store the content URI and load documents
      await requestDirectoryAccess(dirUri);

      // Save the URI to settings for future use
      await updateSettings({ docsPath: dirUri });

      const docs = await getDocuments(dirUri);
      setDocuments(docs);

      if (docs.length === 0) {
        alert(MESSAGES.ERRORS.NO_DOCUMENTS_FOUND);
      }
    } else {
      alert(MESSAGES.ERRORS.FOLDER_SELECTION_FAILED);
    }
  };

  const handlePickFile = async () => {
    const platform = Capacitor.getPlatform();
    try {
      if (platform === 'web') {
        if (!('showOpenFilePicker' in window)) {
          alert(MESSAGES.ERRORS.BROWSER_NOT_SUPPORTED);
          return;
        }
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Markdown files', accept: { 'text/markdown': ['.md'] } }],
          multiple: false,
        });
        const file: File = await fileHandle.getFile();
        const content = await file.text();
        const doc = loadSingleFile(file.name, content);
        onDocumentSelect(doc);
      } else {
        const result = await FilePicker.pickFiles({ limit: 1, readData: true });
        const picked = result.files[0];
        if (!picked) return;

        // Decode base64 content returned by the mobile FilePicker
        const content = atob(picked.data ?? '');
        const doc = loadSingleFile(picked.name, content);
        onDocumentSelect(doc);
      }
    } catch (error: any) {
      // User cancelled the picker — don't show an error
      if (error?.name === 'AbortError') return;
      console.error('Failed to pick file:', error);
      alert(`Could not open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePickFolder = async () => {
    const platform = Capacitor.getPlatform();

    setIsLoading(true);
    try {
      if (platform === 'web') {
        await handlePickFolderWeb();
      } else {
        await handlePickFolderMobile();
      }
    } catch (error) {
      console.error('Failed to pick folder:', error);
      alert(MESSAGES.ERRORS.FOLDER_ACCESS_FAILED(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const isWeb = Capacitor.getPlatform() === 'web';
  // Show folder picker if:
  // - Web: no directory handle acquired
  // - Mobile: no docsPath saved in settings
  const needsFolderPicker = isWeb ? !hasWebDirectoryAccess() : !settings.docsPath;

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overscrollBehavior: 'none',
      width: '100vw',
      overflow: 'hidden',
    }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MarkLearn
          </Typography>

          <IconButton color="inherit" onClick={onOpenDecks}>
            <CardsIcon />
          </IconButton>

          <IconButton color="inherit" onClick={handlePickFile} title="Open markdown file">
            <FileIcon />
          </IconButton>

          <IconButton color="inherit" onClick={loadDocuments} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>

          <IconButton color="inherit" onClick={toggleTheme}>
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <IconButton color="inherit" onClick={onOpenSettings}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container sx={{
        flex: 1,
        py: 3,
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehaviorX: 'none',
      }}>
        {needsFolderPicker ? (
          <EmptyState
            icon={<FolderIcon sx={{ fontSize: 64, opacity: 0.5 }} />}
            title="No folder selected"
            description="Pick a folder containing your markdown documents"
            action={{
              label: "Pick Folder",
              onClick: handlePickFolder,
            }}
          />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="Check if your selected folder contains markdown files"
          />
        ) : (
          <List>
            {documents.map((doc) => (
              <ListItem key={doc.id} disablePadding>
                <ListItemButton onClick={() => handleDocumentClick(doc)}>
                  <FolderIcon sx={{ mr: 2, opacity: 0.7 }} />
                  <ListItemText
                    primary={doc.title}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Container>
    </Box>
  );
};
