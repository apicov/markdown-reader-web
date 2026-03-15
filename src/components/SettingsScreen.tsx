/**
 * Settings Screen
 *
 * Allows user to configure app settings including document path and LLM API settings.
 */

import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const { settings, updateSettings } = useSettings();

  const [docsPath, setDocsPath] = useState(settings.docsPath || '');
  const [fontSize, setFontSize] = useState(settings.fontSize.toString());
  const [llmApiUrl, setLlmApiUrl] = useState(settings.llmApiUrl || '');
  const [llmApiKey, setLlmApiKey] = useState(settings.llmApiKey || '');
  const [llmModel, setLlmModel] = useState(settings.llmModel || '');
  const [targetLanguage, setTargetLanguage] = useState(settings.targetLanguage || 'Spanish');
  const [translationEnabled, setTranslationEnabled] = useState(
    settings.translationEnabled ?? true
  );

  const handleSave = async () => {
    await updateSettings({
      docsPath,
      fontSize: parseInt(fontSize) || 16,
      llmApiUrl,
      llmApiKey,
      llmModel,
      targetLanguage,
      translationEnabled,
    });
    onClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed">
        <Toolbar>
          <IconButton color="inherit" onClick={onClose} edge="start" sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Settings
          </Typography>
          <Button color="inherit" onClick={handleSave}>
            Save
          </Button>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container sx={{ flex: 1, py: 3, mt: '64px', overflow: 'auto' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Document Settings
          </Typography>

          <TextField
            fullWidth
            label="Documents Folder Path"
            value={docsPath}
            onChange={(e) => setDocsPath(e.target.value)}
            margin="normal"
            helperText="Path to folder containing your markdown documents"
          />

          <TextField
            fullWidth
            label="Font Size (px)"
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            margin="normal"
            helperText="Base font size for markdown content (10-32)"
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Translation Settings
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={translationEnabled}
                onChange={(e) => setTranslationEnabled(e.target.checked)}
              />
            }
            label="Enable Translation Feature"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="LLM API URL"
            value={llmApiUrl}
            onChange={(e) => setLlmApiUrl(e.target.value)}
            margin="normal"
            helperText="e.g., https://api.openai.com/v1/chat/completions"
            disabled={!translationEnabled}
          />

          <TextField
            fullWidth
            label="API Key"
            type="password"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            margin="normal"
            helperText="Your API key for the LLM service"
            disabled={!translationEnabled}
          />

          <TextField
            fullWidth
            label="Model"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            margin="normal"
            helperText="e.g., gpt-4, llama-3.3-70b-versatile"
            disabled={!translationEnabled}
          />

          <TextField
            fullWidth
            label="Target Language"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            margin="normal"
            helperText="Language for translations (e.g., Spanish, French)"
            disabled={!translationEnabled}
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={handleSave} fullWidth>
              Save Settings
            </Button>
            <Button variant="outlined" onClick={onClose} fullWidth>
              Cancel
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
