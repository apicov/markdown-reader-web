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
  CircularProgress,
  Button,
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
import { Capacitor } from '@capacitor/core';
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
  const { settings } = useSettings();
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
    console.log('Pick folder button clicked');

    // Check if File System Access API is supported
    // @ts-ignore
    if (!('showDirectoryPicker' in window)) {
      alert('File System Access API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Requesting directory access...');
      const handle = await requestDirectoryAccess();
      console.log('Directory handle received:', handle);

      if (handle) {
        // Load documents from the selected folder
        console.log('Loading documents...');
        const docs = await getDocuments('');
        console.log('Documents loaded:', docs.length);
        setDocuments(docs);

        if (docs.length === 0) {
          alert('No document folders found. Make sure your folder contains subdirectories with .md files.');
        }
      } else {
        console.log('No handle returned');
        alert('Folder selection was cancelled or failed.');
      }
    } catch (error) {
      console.error('Failed to pick folder:', error);
      alert(`Failed to access folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isWeb = Capacitor.getPlatform() === 'web';
  const needsFolderPicker = isWeb && !hasWebDirectoryAccess();

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
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <FolderIcon sx={{ fontSize: 64, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary">
              No folder selected
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Pick a folder containing your markdown documents
            </Typography>
            <Button
              variant="contained"
              onClick={handlePickFolder}
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              Pick Folder
            </Button>
          </Box>
        ) : !settings.docsPath && !isWeb ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <FolderIcon sx={{ fontSize: 64, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary">
              No documents folder selected
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Please go to Settings and enter the path to your documents folder
            </Typography>
            <Button variant="contained" onClick={onOpenSettings} sx={{ mt: 2 }}>
              Open Settings
            </Button>
          </Box>
        ) : isLoading ? (
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
        ) : documents.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No documents found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check if your selected folder contains markdown files
            </Typography>
          </Box>
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
