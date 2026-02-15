/**
 * Decks Screen
 *
 * Displays list of flashcard decks with statistics and allows deck management.
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
  Button,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import type { Deck } from '../types';
import { cardDb } from '../services/cardDatabaseService';
import { downloadDeckAsAnki, importDeckFromAnki } from '../services/ankiExportService';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

interface DecksScreenProps {
  onBack: () => void;
  onReviewDeck: (deckId: string) => void;
}

export const DecksScreen: React.FC<DecksScreenProps> = ({
  onBack,
  onReviewDeck,
}) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckStats, setDeckStats] = useState<Map<string, { total: number; due: number; new: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importDeckName, setImportDeckName] = useState('');
  const [importContent, setImportContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    setIsLoading(true);
    try {
      const allDecks = await cardDb.getAllDecks();
      setDecks(allDecks);

      // Load statistics for each deck
      const stats = new Map();
      for (const deck of allDecks) {
        const total = await cardDb.getDeckCardCount(deck._id);
        const due = await cardDb.getDueCardsCount(deck._id);
        const newCards = await cardDb.getNewCardsCount(deck._id);
        stats.set(deck._id, { total, due, new: newCards });
      }
      setDeckStats(stats);
    } catch (error) {
      console.error('Failed to load decks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;

    setIsCreating(true);
    try {
      await cardDb.createDeck(newDeckName.trim());
      await loadDecks();
      setCreateDialogOpen(false);
      setNewDeckName('');
    } catch (error) {
      console.error('Failed to create deck:', error);
      alert('Failed to create deck. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (deck: Deck, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the deck click
    setDeckToDelete(deck);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deckToDelete) return;

    setIsDeleting(true);
    try {
      await cardDb.deleteDeck(deckToDelete._id);
      await loadDecks();
      setDeleteDialogOpen(false);
      setDeckToDelete(null);
    } catch (error) {
      console.error('Failed to delete deck:', error);
      alert('Failed to delete deck. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeckToDelete(null);
  };

  const handleExportDeck = async (deck: Deck, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the deck click
    try {
      await downloadDeckAsAnki(deck._id);
    } catch (error) {
      console.error('Failed to export deck:', error);
      alert('Failed to export deck. Please try again.');
    }
  };

  const handleImportClick = () => {
    setImportDialogOpen(true);
    setImportDeckName('');
    setImportContent('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportContent(content);

      // Suggest deck name from filename
      const name = file.name.replace(/\.txt$/i, '').replace(/_/g, ' ');
      setImportDeckName(name);
    };
    reader.readAsText(file);
  };

  const handleImportDeck = async () => {
    if (!importDeckName.trim() || !importContent.trim()) return;

    setIsImporting(true);
    try {
      await importDeckFromAnki(importDeckName.trim(), importContent);
      await loadDecks();
      setImportDialogOpen(false);
      setImportDeckName('');
      setImportContent('');
      alert('Deck imported successfully!');
    } catch (error) {
      console.error('Failed to import deck:', error);
      alert('Failed to import deck. Please check the file format and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={onBack} edge="start" sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Flashcard Decks
          </Typography>

          <IconButton color="inherit" onClick={handleImportClick} title="Import deck">
            <UploadIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container sx={{ flex: 1, py: 3, overflow: 'auto' }}>
        {isLoading ? (
          <LoadingSpinner />
        ) : decks.length === 0 ? (
          <EmptyState
            title="No decks yet"
            description="Create a deck or save cards while reading documents"
            action={{
              label: "Create Deck",
              onClick: () => setCreateDialogOpen(true),
            }}
          />
        ) : (
          <List>
            {decks.map((deck) => {
              const stats = deckStats.get(deck._id) || { total: 0, due: 0, new: 0 };
              return (
                <ListItem
                  key={deck._id}
                  disablePadding
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <ListItemButton onClick={() => onReviewDeck(deck._id)} sx={{ flex: 1, minWidth: 0 }}>
                    <ListItemText
                      primary={deck.name}
                      secondary={
                        stats.total > 0
                          ? `${stats.total} cards • ${stats.due} due • ${stats.new} new`
                          : 'No cards'
                      }
                    />
                  </ListItemButton>
                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, pr: 1 }}>
                    {stats.due > 0 && (
                      <IconButton
                        color="primary"
                        onClick={() => onReviewDeck(deck._id)}
                      >
                        <PlayIcon />
                      </IconButton>
                    )}
                    <IconButton
                      color="primary"
                      onClick={(e) => handleExportDeck(deck, e)}
                      title="Export to Anki"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={(e) => handleDeleteClick(deck, e)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Create Deck Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Deck</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Deck Name"
            fullWidth
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            disabled={isCreating}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newDeckName.trim()) {
                handleCreateDeck();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateDeck}
            variant="contained"
            disabled={isCreating || !newDeckName.trim()}
          >
            {isCreating ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Deck Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Deck?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deckToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will permanently delete the deck and all {deckStats.get(deckToDelete?._id || '')?.total || 0} cards in it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Deck Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Deck from Anki</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Deck Name"
            fullWidth
            value={importDeckName}
            onChange={(e) => setImportDeckName(e.target.value)}
            disabled={isImporting}
            sx={{ mb: 2 }}
          />

          <Button
            variant="outlined"
            component="label"
            fullWidth
            disabled={isImporting}
          >
            Choose TSV/TXT File
            <input
              type="file"
              hidden
              accept=".txt,.tsv"
              onChange={handleFileSelect}
            />
          </Button>

          {importContent && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              File loaded: {importContent.split('\n').filter(l => l.trim()).length} cards detected
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImportDeck}
            variant="contained"
            disabled={isImporting || !importDeckName.trim() || !importContent.trim()}
          >
            {isImporting ? <CircularProgress size={24} /> : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
