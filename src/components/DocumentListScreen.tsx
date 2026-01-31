/**
 * Document List Screen
 *
 * Displays list of available markdown documents and allows user to select one to read.
 */

import { useState, useEffect } from 'react';
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
} from '../services/documentService';

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

  // Load documents on mount and when docsPath changes
  useEffect(() => {
    if (settings.docsPath) {
      loadDocuments();
    }
  }, [settings.docsPath]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const platform = Capacitor.getPlatform();

      // On mobile, restore directory access with the saved URI
      if (platform !== 'web' && settings.docsPath) {
        console.log('[loadDocuments] Restoring directory access with URI:', settings.docsPath);
        await requestDirectoryAccess(settings.docsPath);
      }

      const docs = await getDocuments(settings.docsPath);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentClick = async (doc: Document) => {
    // Find markdown file in folder
    const markdownFile = await findMarkdownInFolder(doc.folderPath);
    if (markdownFile) {
      onDocumentSelect({
        ...doc,
        markdownFile,
      });
    } else {
      alert('No markdown file found in this folder');
    }
  };

  const handlePickFolder = async () => {
    const platform = Capacitor.getPlatform();

    setIsLoading(true);
    try {
      if (platform === 'web') {
        // Web: Use File System Access API
        if (!('showDirectoryPicker' in window)) {
          alert('File System Access API is not supported in this browser. Please use Chrome or Edge.');
          setIsLoading(false);
          return;
        }

        const handle = await requestDirectoryAccess();

        if (handle) {
          // Load documents from the selected folder
          const docs = await getDocuments('');
          setDocuments(docs);

          if (docs.length === 0) {
            alert('No document folders found. Make sure your folder contains subdirectories with .md files.');
          }
        } else {
          alert('Folder selection was cancelled or failed.');
        }
      } else {
        // Mobile: Use Capacitor FilePicker plugin
        const result = await FilePicker.pickDirectory();

        console.log('[handlePickFolder] FilePicker result:', JSON.stringify(result, null, 2));

        // The FilePicker should return a URI on Android, not a path
        const dirUri = (result as any).uri || result.path;

        if (result && dirUri) {
          console.log('[handlePickFolder] Selected URI/path:', dirUri);

          // Store the content URI and load documents
          await requestDirectoryAccess(dirUri);

          // Save the URI to settings for future use
          await updateSettings({ docsPath: dirUri });
          console.log('[handlePickFolder] Saved URI to settings');

          const docs = await getDocuments(dirUri);
          setDocuments(docs);

          console.log('[handlePickFolder] Documents found:', docs.length);

          if (docs.length === 0) {
            alert('No document folders found. Make sure your folder contains subdirectories with .md files.');
          }
        } else {
          console.log('[handlePickFolder] No path/URI in result');
          alert('Folder selection was cancelled or failed.');
        }
      }
    } catch (error) {
      console.error('Failed to pick folder:', error);
      alert(`Failed to access folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isWeb = Capacitor.getPlatform() === 'web';
  // Show folder picker if:
  // - Web: no directory handle acquired
  // - Mobile: no docsPath saved in settings
  const needsFolderPicker = isWeb ? !hasWebDirectoryAccess() : !settings.docsPath;

  console.log('[DocumentListScreen] Render - isWeb:', isWeb, 'needsFolderPicker:', needsFolderPicker, 'docsPath:', settings.docsPath, 'documents:', documents.length, 'isLoading:', isLoading);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Markdown Reader
          </Typography>

          <IconButton color="inherit" onClick={onOpenDecks}>
            <CardsIcon />
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
      <Container sx={{ flex: 1, py: 3, overflow: 'auto' }}>
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
        ) : !settings.docsPath && !isWeb ? (
          <EmptyState
            icon={<FolderIcon sx={{ fontSize: 64, opacity: 0.5 }} />}
            title="No documents folder selected"
            description="Please go to Settings and enter the path to your documents folder"
            action={{
              label: "Open Settings",
              onClick: onOpenSettings,
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
                    secondary={doc.folderPath}
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
