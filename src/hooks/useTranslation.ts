/**
 * Translation Hook
 *
 * Manages LLM-powered text translation with validation and error handling.
 * Integrates with app settings for API configuration.
 */

import { useState, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Translation state and result
 */
export interface TranslationState {
  /** Whether translation is currently in progress */
  isTranslating: boolean;
  /** Translated text result */
  translation: string | null;
  /** Error message if translation failed */
  error: string | null;
}

/**
 * Custom hook for managing text translation
 *
 * Handles:
 * - API configuration validation
 * - Network requests to LLM API
 * - Error handling and user feedback
 * - Loading states
 *
 * @returns Translation state and translate function
 *
 * @example
 * const { translate, state } = useTranslation();
 *
 * const handleTextSelected = async (text: string) => {
 *   const result = await translate(text);
 *   if (result) {
 *     console.log('Translation:', result);
 *   }
 * };
 */
export const useTranslation = () => {
  const { settings } = useSettings();

  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    translation: null,
    error: null,
  });

  /**
   * Validate API configuration before making request
   *
   * @returns True if configuration is valid, false otherwise
   */
  const validateConfiguration = (): boolean => {
    console.log('[useTranslation] Validating configuration...', {
      translationEnabled: settings.translationEnabled,
      hasApiUrl: !!settings.llmApiUrl,
      hasApiKey: !!settings.llmApiKey,
      hasModel: !!settings.llmModel,
    });

    if (!settings.translationEnabled) {
      console.log('[useTranslation] Translation is disabled in settings');
      setState({
        isTranslating: false,
        translation: null,
        error: 'Translation is disabled. Please enable it in Settings.',
      });
      return false;
    }

    if (!settings.llmApiUrl) {
      console.log('[useTranslation] API URL is not configured');
      setState({
        isTranslating: false,
        translation: null,
        error: 'API URL is not configured. Please set it in Settings.',
      });
      return false;
    }

    if (!settings.llmApiKey) {
      console.log('[useTranslation] API Key is not configured');
      setState({
        isTranslating: false,
        translation: null,
        error: 'API Key is not configured. Please set it in Settings.',
      });
      return false;
    }

    if (!settings.llmModel) {
      console.log('[useTranslation] Model is not configured');
      setState({
        isTranslating: false,
        translation: null,
        error: 'Model is not configured. Please set it in Settings.',
      });
      return false;
    }

    console.log('[useTranslation] Configuration is valid');
    return true;
  };

  /**
   * Translate selected text using configured LLM API
   *
   * @param text - Text to translate
   * @returns Translated text, or null if translation failed/was cancelled
   */
  const translate = useCallback(async (text: string): Promise<string | null> => {
    console.log('[useTranslation] Translate called with text:', text.substring(0, 50));

    // Validate configuration
    if (!validateConfiguration()) {
      console.log('[useTranslation] Validation failed, showing error dialog');
      return null;
    }

    // Start loading
    console.log('[useTranslation] Starting translation...');
    setState({
      isTranslating: true,
      translation: null,
      error: null,
    });

    try {
      const targetLanguage = settings.targetLanguage || 'Spanish';
      const prompt = `Translate the following text to ${targetLanguage}. If the text is already in ${targetLanguage}, rewrite it in a simpler and more understandable way:\n\n${text}`;

      const response = await fetch(settings.llmApiUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.llmApiKey}`,
        },
        body: JSON.stringify({
          model: settings.llmModel,
          messages: [
            {
              role: 'system',
              content: `You are a helpful translation and simplification assistant. When translating, provide ONLY the translated text without any labels, prefixes, or explanations like "Translation:" or "Traducción:". When the text is already in the target language, rewrite it in simpler, clearer language while preserving the meaning. Return ONLY the final text, nothing else.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorMessage = getHttpErrorMessage(response.status, response.statusText);

        setState({
          isTranslating: false,
          translation: null,
          error: errorMessage,
        });

        return null;
      }

      // Parse response
      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || 'No translation available';

      setState({
        isTranslating: false,
        translation: result,
        error: null,
      });

      return result;
    } catch (error) {
      console.error('Translation error:', error);

      const errorMessage = error instanceof Error
        ? getNetworkErrorMessage(error)
        : 'Unknown error occurred. Please try again.';

      setState({
        isTranslating: false,
        translation: null,
        error: errorMessage,
      });

      return null;
    }
  }, [settings.llmApiUrl, settings.llmApiKey, settings.llmModel, settings.targetLanguage]);

  /**
   * Clear translation state
   */
  const clearTranslation = useCallback(() => {
    setState({
      isTranslating: false,
      translation: null,
      error: null,
    });
  }, []);

  return {
    translate,
    clearTranslation,
    state,
  };
};

/**
 * Get user-friendly error message for HTTP status codes
 */
function getHttpErrorMessage(status: number, statusText: string): string {
  switch (status) {
    case 401:
      return 'Invalid API Key. Please check your credentials in Settings.';
    case 404:
      return 'Invalid API URL or endpoint not found. Please check the URL in Settings.';
    case 429:
      return 'Rate limit exceeded. Please try again later.';
    case 400:
      return 'Invalid request. Please check your Model name in Settings.';
    default:
      if (status >= 500) {
        return 'Server error. Please try again later.';
      }
      return `Error ${status}: ${statusText}`;
  }
}

/**
 * Get user-friendly error message for network errors
 */
function getNetworkErrorMessage(error: Error): string {
  if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
    return 'Network error. Please check your internet connection.';
  }
  return error.message;
}
